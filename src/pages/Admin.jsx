import React, { useState, useEffect } from 'react';
import { BsArrowLeft, BsMenuButtonWide, BsX, BsBoxArrowRight } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';

// Import new components
import Sidebar from '../components/admin/Sidebar';
import SiteSettings from '../components/admin/SiteSettings';
import LocationEditor from '../components/admin/LocationEditor';

const Admin = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('locations'); // 'locations' or 'settings'
    const [checkpoints, setCheckpoints] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCpIndex, setSelectedCpIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [optProgress, setOptProgress] = useState({ current: 0, total: 0 });
    const [couple, setCouple] = useState(null);

    useEffect(() => {
        checkAuthAndFetchData();
    }, []);

    const checkAuthAndFetchData = async () => {
        // Check auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login', { replace: true });
            return;
        }

        // Fetch user's couple
        const { data: coupleData, error: coupleError } = await supabase
            .from('couples')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (coupleError || !coupleData) {
            // No couple found, redirect to onboarding
            navigate('/onboarding', { replace: true });
            return;
        }

        setCouple(coupleData);
        await fetchData(coupleData.id);
    };

    const fetchData = async (coupleId) => {
        setLoading(true);
        // Fetch locations scoped to couple
        const { data: cpData } = await supabase
            .from('checkpoints')
            .select('*')
            .eq('couple_id', coupleId)
            .order('order_index', { ascending: true });
        if (cpData) setCheckpoints(cpData);

        // Fetch settings from couple
        const { data: coupleData } = await supabase
            .from('couples')
            .select('*')
            .eq('id', coupleId)
            .single();
        if (coupleData) {
            setSettings(coupleData);
            setCouple(coupleData);
        }

        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/', { replace: true });
    };

    const [bgUploading, setBgUploading] = useState(false);

    const uploadBg = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBgUploading(true);
        const name = `brand/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('memories').upload(name, file);
        if (error) {
            alert('Upload error. Check if "memories" bucket exists.');
            setBgUploading(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('memories').getPublicUrl(name);
        // Use updateSettings to persist the URL to database
        updateSettings('hero_bg_url', publicUrl);
        setBgUploading(false);
    };

    // Validate checkpoint for non-nullable fields
    const validateCheckpoint = (checkpoint) => {
        const errors = {};
        if (!checkpoint.title || checkpoint.title.trim() === '') {
            errors.title = 'Location Name is required';
        }
        if (checkpoint.latitude === null || checkpoint.latitude === undefined || checkpoint.latitude === '') {
            errors.latitude = 'Location coordinates are required';
        }
        if (checkpoint.longitude === null || checkpoint.longitude === undefined || checkpoint.longitude === '') {
            errors.longitude = 'Location coordinates are required';
        }
        return errors;
    };

    // Manual save checkpoint
    const saveCheckpoint = async (checkpoint) => {
        const errors = validateCheckpoint(checkpoint);
        if (Object.keys(errors).length > 0) {
            return { success: false, errors };
        }

        const isNew = !checkpoint.id;
        const { data, error } = await supabase
            .from('checkpoints')
            .upsert(checkpoint)
            .select()
            .single();

        if (error) {
            return { success: false, errors: { general: error.message } };
        }

        // Only refetch for new checkpoints to get the generated ID
        // For existing checkpoints, update local state without full reload
        if (isNew && data) {
            await fetchData(couple.id);
        }
        return { success: true, errors: {} };
    };

    // Manual save settings
    const saveSettings = async () => {
        // Update the couples table with new settings
        const { id, created_at, user_id, ...updates } = settings;
        const { error } = await supabase.from('couples').update(updates).eq('id', couple.id);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    // Helper to update checkpoint locally (no auto-save)
    const updateCheckpoint = (index, field, value) => {
        const next = [...checkpoints];
        next[index] = { ...next[index], [field]: value };
        setCheckpoints(next);
    };

    // Helper to update settings locally (no auto-save)
    const updateSettings = (field, value) => {
        const newSettings = { ...settings, [field]: value };
        setSettings(newSettings);
        setCouple(newSettings);
    };

    // Handle Reorder and Auto-save
    const saveOrderRef = React.useRef(null);
    const handleReorder = (newOrder) => {
        setCheckpoints(newOrder); // Optimistic UI update

        if (saveOrderRef.current) clearTimeout(saveOrderRef.current);
        saveOrderRef.current = setTimeout(async () => {
            // Prepare payload with updated order_index
            const payload = newOrder.map((cp, i) => ({ ...cp, order_index: i }));

            // Batch upsert to persist order
            // Note: We send full object to satisfy NOT NULL constraints on upsert
            const { error } = await supabase.from('checkpoints').upsert(payload);
            if (error) console.error('Error saving order:', error);
        }, 1000);
    };

    const optimizeLibrary = async () => {
        if (!confirm("This will scan all your images, compress massive files (>500KB), and re-upload them. This reduces map lag but may take a few minutes. Continue?")) return;

        setOptimizing(true);
        try {
            // 1. Fetch all memories scoped to couple
            const { data: memories, error } = await supabase
                .from('memories')
                .select('*')
                .eq('couple_id', couple.id);
            if (error) throw error;

            console.log(`Found ${memories.length} memories to check.`);
            setOptProgress({ current: 0, total: memories.length });

            let optimizedCount = 0;

            for (let i = 0; i < memories.length; i++) {
                const mem = memories[i];
                setOptProgress({ current: i + 1, total: memories.length });

                try {
                    // 2. Fetch Blob
                    const response = await fetch(mem.image_url);
                    const blob = await response.blob();

                    // 3. Check Size (e.g. > 500KB)
                    if (blob.size > 500 * 1024) {
                        const file = new File([blob], "temp.jpg", { type: blob.type });

                        // 4. Compress (Max 1600px, 0.8 quality)
                        const compressedFile = await compressImage(file, { maxWidth: 1600, quality: 0.8 });

                        if (compressedFile.size < blob.size) {
                            // 5. Upload New Version w/ "optimized/" prefix
                            const newName = `optimized/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                            const { error: uploadError } = await supabase.storage.from('memories').upload(newName, compressedFile);

                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage.from('memories').getPublicUrl(newName);

                                // 6. Update DB
                                await supabase.from('memories').update({ image_url: publicUrl }).eq('id', mem.id);
                                optimizedCount++;
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`Skipping memory ${mem.id}:`, err);
                }
            }
            alert(`Optimization Complete! Optimized ${optimizedCount} heavy images.`);
        } catch (err) {
            console.error(err);
            alert("Optimization failed. Check console.");
        } finally {
            setOptimizing(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-serif italic text-stone-400">Summoning Studio...</div>;

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row pb-20 overflow-hidden">

            {/* Mobile Header Toggle */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-200 sticky top-0 z-[60]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 bg-stone-100 rounded-lg text-primary"
                    >
                        {sidebarOpen ? <BsX className="text-xl" /> : <BsMenuButtonWide className="text-xl" />}
                    </button>
                    <div>
                        <h1 className="font-serif italic text-lg leading-tight">Studio</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                </div>
            </div>

            {/* Sidebar */}
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                checkpoints={checkpoints}
                setCheckpoints={setCheckpoints}
                handleReorder={handleReorder}
                selectedCpIndex={selectedCpIndex}
                setSelectedCpIndex={setSelectedCpIndex}
                navigate={navigate}
                couple={couple}
                onLogout={handleLogout}
            />

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} className="md:hidden fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-40 transition-all" />
            )}

            {/* Editor Area */}
            <div className="flex-1 p-4 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'settings' ? (
                        <SiteSettings
                            settings={settings}
                            updateSettings={updateSettings}
                            saveSettings={saveSettings}
                            uploadBg={uploadBg}
                            bgUploading={bgUploading}
                            optimizing={optimizing}
                            optimizeLibrary={optimizeLibrary}
                            optProgress={optProgress}
                            couple={couple}
                        />
                    ) : (
                        <LocationEditor
                            checkpoint={checkpoints[selectedCpIndex]}
                            updateCheckpoint={updateCheckpoint}
                            saveCheckpoint={saveCheckpoint}
                            validateCheckpoint={validateCheckpoint}
                            fetchData={() => fetchData(couple.id)}
                            checkpoints={checkpoints}
                            setCheckpoints={setCheckpoints}
                            selectedCpIndex={selectedCpIndex}
                            coupleId={couple.id}
                        />
                    )}
                </div>
            </div>

            {/* <button onClick={() => navigate(`/${couple?.path || ''}`)} className="fixed bottom-6 left-6 md:left-auto md:right-8 p-4 bg-white rounded-full shadow-xl border border-stone-100 text-stone-400 hover:text-primary transition-all hover:scale-110 z-[60] active:scale-95">
                <BsArrowLeft className="text-xl" />
            </button> */}
        </div>
    );
};

export default Admin;
