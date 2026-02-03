import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { compressImage } from '../utils/imageCompression';
import ProtectedRoute from '../components/ProtectedRoute';
import { useNavigate } from 'react-router-dom';
import {
    BsArrowLeft, BsMap, BsImages, BsSave, BsPlus,
    BsTrash, BsShieldLock, BsUpload, BsMenuButtonWide,
    BsX, BsGearWideConnected, BsGeoAlt, BsSearch, BsGripVertical
} from 'react-icons/bs';
import { supabase } from '../lib/supabase';

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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Fetch locations
        const { data: cpData } = await supabase.from('checkpoints').select('*').order('order_index', { ascending: true });
        if (cpData) setCheckpoints(cpData);

        // Fetch settings
        const { data: settingsData } = await supabase.from('site_settings').select('*').single();
        if (settingsData) setSettings(settingsData);

        setLoading(false);
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

    // Auto-save checkpoint (debounced)
    const saveCheckpointRef = React.useRef(null);
    const autoSaveCheckpoint = (checkpoint) => {
        if (saveCheckpointRef.current) clearTimeout(saveCheckpointRef.current);
        saveCheckpointRef.current = setTimeout(async () => {
            if (!checkpoint.id) return; // Can't save unsaved checkpoint
            // Exclude address field if it exists (not in DB schema)
            const { address, ...cpToSave } = checkpoint;
            await supabase.from('checkpoints').upsert(cpToSave);
        }, 500);
    };

    // Auto-save settings (debounced)
    const saveSettingsRef = React.useRef(null);
    const autoSaveSettings = (newSettings) => {
        if (saveSettingsRef.current) clearTimeout(saveSettingsRef.current);
        saveSettingsRef.current = setTimeout(async () => {
            await supabase.from('site_settings').update(newSettings).eq('id', 1);
        }, 500);
    };

    // Helper to update checkpoint and trigger auto-save
    const updateCheckpoint = (index, field, value) => {
        const next = [...checkpoints];
        next[index] = { ...next[index], [field]: value };
        setCheckpoints(next);
        autoSaveCheckpoint(next[index]);
    };

    // Helper to update settings and trigger auto-save  
    const updateSettings = (field, value) => {
        const newSettings = { ...settings, [field]: value };
        setSettings(newSettings);
        autoSaveSettings(newSettings);
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
        if (!confirm("This will scan all images, compress massive files (>500KB), and re-upload them. This reduces map lag but may take a few minutes. Continue?")) return;

        setOptimizing(true);
        try {
            // 1. Fetch all memories
            const { data: memories, error } = await supabase.from('memories').select('*');
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
                <div className="text-[9px] uppercase tracking-widest text-stone-300 font-bold">Auto-saves</div>
            </div>

            {/* Sidebar */}
            <AnimatePresence>
                {(sidebarOpen || window.innerWidth >= 768) && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full md:w-80 bg-white border-r border-stone-200 flex flex-col pt-16 md:pt-10 fixed md:sticky top-0 h-full z-50 md:z-auto"
                    >
                        <div className="px-8 mb-10 hidden md:flex justify-between items-center">
                            <div>
                                <h1 className="font-serif italic text-2xl text-primary leading-none">Studio</h1>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-accent mt-1">Admin Dashboard</p>
                            </div>
                            <button onClick={() => { localStorage.removeItem('isAuthenticated'); navigate('/login'); }} className="text-stone-300 hover:text-red-400 transition-colors"><BsShieldLock /></button>
                        </div>

                        {/* Top Level Nav */}
                        <div className="px-4 mb-8 space-y-1">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full text-left px-5 py-3 rounded-2xl transition-all flex items-center gap-3 ${activeTab === 'settings' ? 'bg-primary text-white shadow-lg' : 'hover:bg-stone-50 text-stone-400'}`}
                            >
                                <BsGearWideConnected />
                                <span className="text-sm font-bold uppercase tracking-widest">Site Settings</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 space-y-1 mb-8 custom-scrollbar">
                            <p className="px-4 text-[10px] uppercase font-bold text-stone-300 mb-2 tracking-widest">Chapters (Drag to Reorder)</p>
                            <Reorder.Group axis="y" values={checkpoints} onReorder={handleReorder} className="space-y-1">
                                {checkpoints.map((cp, i) => (
                                    <Reorder.Item key={cp.id} value={cp} className="relative group/item flex items-center pr-2 rounded-2xl hover:bg-stone-50 transition-colors">
                                        {/* Drag Handle */}
                                        <div className="p-3 cursor-grab active:cursor-grabbing text-stone-300 hover:text-red-300 transition-colors">
                                            <BsGripVertical />
                                        </div>

                                        {/* Selection Button */}
                                        <button
                                            onClick={() => {
                                                setSelectedCpIndex(i);
                                                setActiveTab('locations');
                                                if (window.innerWidth < 768) setSidebarOpen(false);
                                            }}
                                            className={`flex-1 text-left py-3.5 pr-4 rounded-r-2xl transition-all flex items-center justify-between ${activeTab === 'locations' && selectedCpIndex === i ? 'text-primary font-medium' : 'text-stone-400'}`}
                                        >
                                            <span className="truncate pr-2">{cp.title || '(Untitled)'}</span>
                                            {activeTab === 'locations' && selectedCpIndex === i && <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />}
                                        </button>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                            <button
                                onClick={async () => {
                                    const newCp = {
                                        title: 'New Spot',
                                        date: '',
                                        description: '',
                                        latitude: 0,
                                        longitude: 0,
                                        zoom: 13,
                                        order_index: checkpoints.length
                                    };

                                    // Create in DB first to get ID
                                    const { data, error } = await supabase.from('checkpoints').insert(newCp).select().single();

                                    if (data) {
                                        setCheckpoints([...checkpoints, data]);
                                        setSelectedCpIndex(checkpoints.length);
                                        setActiveTab('locations');
                                    } else if (error) {
                                        console.error('Error creating checkpoint:', error);
                                        alert('Could not create new location. See console.');
                                    }
                                }}
                                className="w-full text-left px-5 py-3.5 text-red-400 hover:bg-red-50 rounded-2xl flex items-center gap-3 text-sm font-medium mt-4 group"
                            >
                                <div className="p-1 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                                    <BsPlus className="text-lg" />
                                </div>
                                Add New Location
                            </button>
                        </div>

                        <div className="p-6 border-t border-stone-100 bg-white">
                            <div className="text-center text-xs text-stone-300 font-medium py-2">
                                ✓ Auto-saves as you type
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} className="md:hidden fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-40 transition-all" />
            )}

            {/* Editor Area */}
            <div className="flex-1 p-4 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'settings' ? (
                        <div className="space-y-8 md:space-y-12">
                            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 hidden md:block">
                                    <BsGearWideConnected className="text-8xl" />
                                </div>

                                <h2 className="text-3xl font-serif text-primary mb-8">Site Customization</h2>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field label="Landing Label" value={settings?.hero_label} onChange={(v) => updateSettings('hero_label', v)} />
                                        <Field label="Landing Title" value={settings?.hero_title} onChange={(v) => updateSettings('hero_title', v)} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Subtext / Quote</label>
                                        <textarea
                                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-32 resize-none focus:bg-white focus:border-red-100 transition-all"
                                            value={settings?.hero_subtext}
                                            onChange={(e) => updateSettings('hero_subtext', e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Background Image</label>
                                            <div className="flex gap-4">
                                                <label className={`flex-1 cursor-pointer bg-stone-50 border border-stone-100 rounded-2xl hover:bg-white hover:border-red-100 transition-all px-6 py-3.5 flex items-center justify-center gap-3 text-sm font-bold text-primary ${bgUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <BsUpload className="text-red-400" />
                                                    {bgUploading ? 'Uploading...' : (settings?.hero_bg_url ? 'Change Background' : 'Upload Background')}
                                                    <input type="file" className="hidden" onChange={uploadBg} accept="image/*" />
                                                </label>
                                                {settings?.hero_bg_url && (
                                                    <button
                                                        onClick={async () => {
                                                            // Extract file path from URL
                                                            const url = settings.hero_bg_url;
                                                            const pathMatch = url.match(/memories\/(.+)$/);
                                                            if (pathMatch) {
                                                                await supabase.storage.from('memories').remove([pathMatch[1]]);
                                                            }
                                                            // Clear from database
                                                            updateSettings('hero_bg_url', '');
                                                        }}
                                                        className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-100 transition-colors"
                                                        title="Remove background"
                                                    >
                                                        <BsTrash />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2 font-sans">Map Style Preset</label>
                                            <select
                                                className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-3.5 outline-none focus:bg-white focus:border-red-100 transition-all"
                                                value={settings?.map_style}
                                                onChange={(e) => updateSettings('map_style', e.target.value)}
                                            >
                                                <option value="mapbox://styles/mapbox/light-v11">Classic Light</option>
                                                <option value="mapbox://styles/mapbox/dark-v11">Elegant Dark</option>
                                                <option value="mapbox://styles/mapbox/satellite-v9">Photorealistic Satellite</option>
                                                <option value="mapbox://styles/mapbox/streets-v12">Detailed Streets</option>
                                                <option value="mapbox://styles/mapbox/outdoors-v12">Outdoor Terrain</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Map Configuration Sliders */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50 p-6 rounded-3xl border border-stone-100">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Zoom Level (Altitude)</label>
                                                <span className="text-xs font-mono font-bold text-primary bg-white px-2 py-1 rounded-md border border-stone-100">
                                                    {settings?.map_zoom_level || 13}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="2"
                                                max="18"
                                                step="0.5"
                                                className="w-full accent-red-400 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                                value={settings?.map_zoom_level || 13}
                                                onChange={(e) => updateSettings('map_zoom_level', parseFloat(e.target.value))}
                                            />
                                            <div className="flex justify-between text-[10px] text-stone-400 font-mono px-1">
                                                <span>Global (2)</span>
                                                <span>Street (18)</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">3D Pitch (Tilt)</label>
                                                <span className="text-xs font-mono font-bold text-primary bg-white px-2 py-1 rounded-md border border-stone-100">
                                                    {settings?.map_pitch || 0}°
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="60"
                                                step="5"
                                                className="w-full accent-red-400 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                                value={settings?.map_pitch || 0}
                                                onChange={(e) => updateSettings('map_pitch', parseFloat(e.target.value))}
                                            />
                                            <div className="flex justify-between text-[10px] text-stone-400 font-mono px-1">
                                                <span>Flat (0°)</span>
                                                <span>3D (60°)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Blur Intensity Slider */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Background Blur Intensity</label>
                                            <span className="text-xs text-stone-400 font-mono">{settings?.hero_blur_amount || 16}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="30"
                                            value={settings?.hero_blur_amount || 16}
                                            onChange={(e) => updateSettings('hero_blur_amount', parseInt(e.target.value))}
                                            className="w-full h-2 bg-stone-100 rounded-full appearance-none cursor-pointer accent-red-400"
                                        />
                                        <div className="flex justify-between text-[9px] text-stone-300 font-mono">
                                            <span>Sharp</span>
                                            <span>Blurry</span>
                                        </div>
                                    </div>

                                    {settings?.hero_bg_url && (
                                        <div className="mt-4">
                                            <p className="text-[9px] uppercase font-bold text-stone-300 ml-2 mb-2">Preview (Blurred)</p>
                                            <div className="w-full h-40 rounded-3xl overflow-hidden relative">
                                                <img
                                                    src={settings.hero_bg_url}
                                                    className="w-full h-full object-cover scale-110 transition-all duration-300"
                                                    style={{ filter: `blur(${settings?.hero_blur_amount || 16}px)` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-white font-serif italic text-2xl shadow-inner">
                                                    {settings.hero_title}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Customization */}
                            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                                <h2 className="text-3xl font-serif text-primary mb-8">Footer Section</h2>

                                <div className="space-y-6">
                                    <Field
                                        label="Footer Title"
                                        value={settings?.footer_title}
                                        onChange={(v) => updateSettings('footer_title', v)}
                                        placeholder="To Forever & Beyond"
                                    />

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Footer Description</label>
                                        <textarea
                                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-32 resize-none focus:bg-white focus:border-red-100 transition-all"
                                            value={settings?.footer_description || ''}
                                            onChange={(e) => updateSettings('footer_description', e.target.value)}
                                            placeholder="Built with love and shared memories..."
                                        />
                                    </div>

                                    <Field
                                        label="Footer Caption"
                                        value={settings?.footer_caption}
                                        onChange={(v) => updateSettings('footer_caption', v)}
                                        placeholder="2026 Valentines"
                                    />
                                </div>
                            </div>

                            {/* Maintenance Tool */}
                            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                                <h2 className="text-3xl font-serif text-primary mb-6">Maintenance</h2>
                                <p className="text-sm text-stone-400 mb-6 font-sans">
                                    Reduce memory usage by optimizing all existing images in your library.
                                </p>

                                {optimizing ? (
                                    <div className="space-y-4">
                                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-400 transition-all duration-300"
                                                style={{ width: `${(optProgress.current / optProgress.total) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs font-mono text-stone-500">
                                            <span>Processing...</span>
                                            <span>{optProgress.current} / {optProgress.total}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={optimizeLibrary}
                                        disabled={optimizing}
                                        className="w-full py-4 bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 font-bold uppercase tracking-widest text-xs rounded-2xl transition-all border border-stone-100 hover:border-red-100"
                                    >
                                        Optimize Image Library
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : checkpoints[selectedCpIndex] ? (
                        <div className="space-y-8 md:space-y-12">
                            {/* Checkpoint Details */}
                            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5 hidden md:block">
                                    <BsMap className="text-8xl" />
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <h2 className="text-3xl font-serif text-primary">Edit location</h2>
                                    <button
                                        onClick={() => {
                                            const id = checkpoints[selectedCpIndex].id;
                                            if (id) {
                                                if (window.confirm('Delete this location and all its photos?')) {
                                                    supabase.from('checkpoints').delete().eq('id', id).then(() => fetchData());
                                                }
                                            } else {
                                                setCheckpoints(checkpoints.filter((_, i) => i !== selectedCpIndex));
                                            }
                                        }}
                                        className="text-stone-300 hover:text-red-400 transition-all flex items-center gap-2 text-xs uppercase tracking-widest font-bold"
                                    >
                                        <BsTrash /> Remove chapter
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <Field label="Location Name" value={checkpoints[selectedCpIndex].title} onChange={(v) => updateCheckpoint(selectedCpIndex, 'title', v)} />
                                    <Field label="Map Marker Label" value={checkpoints[selectedCpIndex].marker_label || ''} onChange={(v) => updateCheckpoint(selectedCpIndex, 'marker_label', v)} placeholder="Short name for map pin" />
                                    <Field label="Special Date" value={checkpoints[selectedCpIndex].date} onChange={(v) => updateCheckpoint(selectedCpIndex, 'date', v)} />
                                    <div className="col-span-1 md:col-span-2">
                                        <AddressSearch
                                            latitude={checkpoints[selectedCpIndex].latitude}
                                            longitude={checkpoints[selectedCpIndex].longitude}
                                            address={checkpoints[selectedCpIndex].address || ''}
                                            onSelect={(lat, lng, addr) => {
                                                const next = [...checkpoints];
                                                next[selectedCpIndex].latitude = lat;
                                                next[selectedCpIndex].longitude = lng;
                                                next[selectedCpIndex].address = addr;
                                                setCheckpoints(next);
                                                autoSaveCheckpoint(next[selectedCpIndex]);
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Story Fragment</label>
                                        <textarea
                                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-40 resize-none focus:bg-white focus:border-red-100 transition-all"
                                            placeholder="Write about what happened here..."
                                            value={checkpoints[selectedCpIndex].description}
                                            onChange={(e) => updateCheckpoint(selectedCpIndex, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Photo Journal Editor */}
                            {checkpoints[selectedCpIndex].id ? (
                                <MemoriesEditor checkpointId={checkpoints[selectedCpIndex].id} />
                            ) : (
                                <div className="bg-stone-100/50 border-2 border-dashed border-stone-200 p-12 rounded-[2.5rem] text-center">
                                    <p className="font-serif italic text-stone-400 mb-4 text-xl">Almost there!</p>
                                    <p className="text-sm text-stone-400">Save this location first to start adding photos.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-[60vh] flex items-center justify-center text-stone-200 flex-col gap-6">
                            <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center animate-pulse">
                                <BsMap className="text-4xl opacity-30" />
                            </div>
                            <p className="font-serif italic text-xl">Select a chapter from the sidebar</p>
                        </div>
                    )}
                </div>
            </div>

            <button onClick={() => navigate('/')} className="fixed bottom-6 left-6 md:left-auto md:right-8 p-4 bg-white rounded-full shadow-xl border border-stone-100 text-stone-400 hover:text-primary transition-all hover:scale-110 z-[60] active:scale-95">
                <BsArrowLeft className="text-xl" />
            </button>
        </div>
    );
};

const Field = ({ label, value, onChange, type = "text", placeholder = "" }) => (
    <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">{label}</label>
        <input
            type={type}
            step="any"
            className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-3.5 outline-none focus:bg-white focus:border-red-100 transition-all font-medium text-primary shadow-sm"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

const AddressSearch = ({ latitude, longitude, address, onSelect }) => {
    const [query, setQuery] = useState(address || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = React.useRef(null);

    // Sync query when address prop changes (switching checkpoints)
    useEffect(() => {
        setQuery(address || '');
    }, [address]);

    const searchAddress = async (text) => {
        if (!text || text.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;
            // Use Google Places Autocomplete API
            const response = await fetch(
                `https://places.googleapis.com/v1/places:autocomplete`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey
                    },
                    body: JSON.stringify({
                        input: text,
                        includedPrimaryTypes: ['street_address', 'subpremise', 'premise', 'establishment', 'geocode']
                    })
                }
            );
            const data = await response.json();
            if (data.suggestions) {
                setSuggestions(data.suggestions.map(s => ({
                    place_id: s.placePrediction?.placeId,
                    name: s.placePrediction?.structuredFormat?.mainText?.text || '',
                    full_address: s.placePrediction?.text?.text || s.placePrediction?.structuredFormat?.secondaryText?.text || ''
                })).filter(s => s.place_id));
            }
        } catch (err) {
            console.error('Search error:', err);
        }
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setShowDropdown(true);

        // Debounce API calls
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchAddress(val), 300);
    };

    const handleSelect = async (suggestion) => {
        setQuery(suggestion.full_address);
        setSuggestions([]);
        setShowDropdown(false);

        // Get place details to retrieve coordinates
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;
            const response = await fetch(
                `https://places.googleapis.com/v1/places/${suggestion.place_id}?fields=location`,
                {
                    headers: {
                        'X-Goog-Api-Key': apiKey
                    }
                }
            );
            const data = await response.json();
            if (data.location) {
                onSelect(data.location.latitude, data.location.longitude, suggestion.full_address);
            }
        } catch (err) {
            console.error('Place details error:', err);
        }
    };

    const hasCoords = latitude && longitude && (latitude !== 0 || longitude !== 0);

    return (
        <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Location</label>
            <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300">
                    <BsSearch />
                </div>
                <input
                    type="text"
                    className="w-full bg-stone-50 border border-stone-100 rounded-2xl pl-12 pr-6 py-3.5 outline-none focus:bg-white focus:border-red-100 transition-all font-medium text-primary shadow-sm"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Search for an address or city..."
                />
                {loading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-stone-200 border-t-red-400 rounded-full animate-spin" />
                    </div>
                )}

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showDropdown && suggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden max-h-60 overflow-y-auto"
                        >
                            {suggestions.map(s => (
                                <button
                                    key={s.place_id}
                                    onClick={() => handleSelect(s)}
                                    className="w-full text-left px-5 py-3.5 hover:bg-stone-50 transition-colors flex items-start gap-3 border-b border-stone-50 last:border-0"
                                >
                                    <BsGeoAlt className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-primary">{s.name}</span>
                                        <span className="text-xs text-stone-400">{s.full_address}</span>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Coordinates Preview */}
            {hasCoords && (
                <div className="flex items-center gap-2 text-xs text-stone-400 ml-2 mt-2">
                    <BsGeoAlt className="text-red-300" />
                    <span>Lat: {latitude?.toFixed(4)}, Lng: {longitude?.toFixed(4)}</span>
                </div>
            )}
        </div>
    );
};

const MemoriesEditor = ({ checkpointId }) => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [flippedCards, setFlippedCards] = useState({});
    const [draggedId, setDraggedId] = useState(null);
    const saveTimeoutRef = useRef({});

    useEffect(() => {
        fetchMemories();
    }, [checkpointId]);

    const fetchMemories = async () => {
        setLoading(true);
        const { data } = await supabase.from('memories').select('*').eq('checkpoint_id', checkpointId).order('order_index', { ascending: true });
        if (data) setMemories(data);
        setLoading(false);
    };

    const upload = async (e) => {
        if (!checkpointId) {
            alert("Please save this location first before adding photos!");
            e.target.value = null;
            return;
        }

        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        let completed = 0;
        const uploadResults = [];

        for (const [index, file] of files.entries()) {
            // Compress Image before upload
            let fileToUpload = file;
            try {
                // Resize to max 1600px width, 0.8 quality
                fileToUpload = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
            } catch (err) {
                console.warn("Compression failed, using original file", err);
            }

            const name = `optimized/${Date.now()}-${fileToUpload.name}`;
            const { error: uploadError } = await supabase.storage.from('memories').upload(name, fileToUpload);

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('memories').getPublicUrl(name);
                uploadResults.push({
                    checkpoint_id: checkpointId,
                    image_url: publicUrl,
                    order_index: memories.length + index
                });
            } else {
                console.error("Storage upload error:", uploadError);
            }
            completed++;
            setUploadProgress(Math.round((completed / files.length) * 100));
        }

        if (uploadResults.length > 0) {
            const { error: insertError } = await supabase.from('memories').insert(uploadResults).select();
            if (insertError) {
                alert(`DB Error: ${insertError.message}`);
            } else {
                await fetchMemories();
                e.target.value = null;
            }
        } else {
            alert("No files were successfully uploaded to storage.");
        }

        setUploading(false);
        setUploadProgress(0);
    };

    const update = (id, field, value) => {
        // 1. Optimistic Update (Instant feedback)
        setMemories(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

        // 2. Debounced Save
        if (saveTimeoutRef.current[`${id}-${field}`]) {
            clearTimeout(saveTimeoutRef.current[`${id}-${field}`]);
        }

        saveTimeoutRef.current[`${id}-${field}`] = setTimeout(async () => {
            await supabase.from('memories').update({ [field]: value }).eq('id', id);
            delete saveTimeoutRef.current[`${id}-${field}`];
        }, 1000); // Wait 1 second after last keystroke
    };



    const remove = async (id) => {
        if (window.confirm('Remove this memory forever?')) {
            // Find the memory to get its image URL
            const memory = memories.find(m => m.id === id);
            if (memory?.image_url) {
                // Extract file path from URL and delete from storage
                const pathMatch = memory.image_url.match(/memories\/(.+)$/);
                if (pathMatch) {
                    await supabase.storage.from('memories').remove([pathMatch[1]]);
                }
            }
            // Delete from database
            await supabase.from('memories').delete().eq('id', id);
            setMemories(memories.filter(m => m.id !== id));
        }
    };

    const toggleFlip = (id, e) => {
        e.stopPropagation();
        setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDragStart = (id) => {
        setDraggedId(id);
    };

    const handleDragOver = (e, targetId) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;

        const draggedIndex = memories.findIndex(m => m.id === draggedId);
        const targetIndex = memories.findIndex(m => m.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newMemories = [...memories];
        const [removed] = newMemories.splice(draggedIndex, 1);
        newMemories.splice(targetIndex, 0, removed);
        setMemories(newMemories);
    };

    const handleDragEnd = async () => {
        if (!draggedId) return;
        setDraggedId(null);

        // Persist new order to Supabase
        const updates = memories.map((m, i) => ({
            id: m.id,
            order_index: i
        }));

        for (const { id, order_index } of updates) {
            await supabase.from('memories').update({ order_index }).eq('id', id);
        }
    };

    const optimizeLibrary = async () => {
        if (!confirm("This will scan all images, compress massive files (>1000KB), and re-upload them. This reduces map lag but may take a few minutes. Continue?")) return;

        setOptimizing(true);
        try {
            // 1. Fetch all memories
            const { data: memories, error } = await supabase.from('memories').select('*');
            if (error) throw error;

            setOptProgress({ current: 0, total: memories.length });
            let optimizedCount = 0;

            for (let i = 0; i < memories.length; i++) {
                const mem = memories[i];
                setOptProgress({ current: i + 1, total: memories.length });

                try {
                    // 2. Fetch Blob
                    const response = await fetch(mem.image_url);
                    const blob = await response.blob();

                    // 3. Check Size (e.g. > 1000KB)
                    if (blob.size > 1000 * 1024) {
                        const file = new File([blob], "temp.jpg", { type: blob.type });

                        // 4. Compress (Max 1600px, 0.8 quality)
                        const compressedFile = await compressImage(file, { maxWidth: 1600, quality: 0.8 });

                        if (compressedFile.size < blob.size) {
                            // 5. Upload New Version
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
            alert(`Optimization Complete! optimized ${optimizedCount} heavy images.`);
        } catch (err) {
            console.error(err);
            alert("Optimization process encountered an error.");
        } finally {
            setOptimizing(false);
        }
    };

    if (loading) return <div className="text-center py-20 font-serif italic text-stone-300">Summoning memories...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-primary">Moment Gallery</h2>
                    <p className="text-xs text-stone-400 mt-1">Click to flip • Drag to reorder</p>
                </div>
                <label className={`w-full md:w-auto glass-capsule cursor-pointer bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all px-8 py-3 flex items-center justify-center gap-3 text-sm font-bold text-primary ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? (
                        <div className="flex items-center gap-3">
                            <div className="relative w-5 h-5">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="10" cy="10" r="8" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-stone-100" />
                                    <circle cx="10" cy="10" r="8" fill="transparent" stroke="currentColor" strokeWidth="2"
                                        strokeDasharray={2 * Math.PI * 8}
                                        strokeDashoffset={2 * Math.PI * 8 * (1 - uploadProgress / 100)}
                                        className="text-red-400 transition-all duration-300"
                                    />
                                </svg>
                            </div>
                            <span>{uploadProgress}%</span>
                        </div>
                    ) : (
                        <>
                            <BsUpload className="text-red-400" />
                            Add Moments
                        </>
                    )}
                    <input type="file" className="hidden" onChange={upload} accept="image/*" multiple />
                </label>
            </div>

            {/* 3-Column Masonry Grid with Flip Cards */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                {memories.map(m => (
                    <div
                        key={m.id}
                        draggable={!flippedCards[m.id]}
                        onDragStart={() => !flippedCards[m.id] && handleDragStart(m.id)}
                        onDragOver={(e) => !flippedCards[m.id] && handleDragOver(e, m.id)}
                        onDragEnd={handleDragEnd}
                        className={`relative mb-6 break-inside-avoid transition-all ${!flippedCards[m.id] ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedId === m.id ? 'opacity-50 scale-95' : ''}`}
                        style={{ perspective: '1000px' }}
                    >
                        <motion.div
                            className="relative w-full"
                            animate={{ rotateY: flippedCards[m.id] ? 180 : 0 }}
                            transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* Front - The Image */}
                            <div
                                className="w-full relative overflow-hidden rounded-2xl shadow-lg group bg-white border border-stone-100"
                                style={{ backfaceVisibility: 'hidden' }}
                                onClick={() => setFlippedCards(prev => ({ ...prev, [m.id]: true }))}
                            >
                                <img
                                    src={m.image_url}
                                    alt="Memory"
                                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                    <span className="text-white text-xs font-mono uppercase tracking-widest backdrop-blur-sm px-2 py-1 rounded border border-white/30">
                                        Click to Edit Notes
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full text-stone-300 hover:text-red-400 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                    <BsTrash />
                                </button>
                            </div>

                            {/* Back - The Notes Editor */}
                            <div
                                className="absolute inset-0 rounded-2xl p-4 bg-white border border-stone-100 shadow-lg flex flex-col cursor-pointer"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)'
                                }}
                                onClick={() => setFlippedCards(prev => ({ ...prev, [m.id]: false }))}
                            >
                                {/* Flip arrow icon in corner */}
                                <div className="absolute top-3 right-3 p-1.5 bg-stone-100 rounded-full text-stone-400 text-xs">
                                    ↻
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto">
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-blue-400 tracking-[0.2em]">His Note</label>
                                        <textarea
                                            value={m.note_him || ''}
                                            onChange={(e) => { update(m.id, 'note_him', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-blue-200 transition-all font-serif italic resize-none overflow-hidden"
                                            placeholder="Add his note..."
                                            rows={1}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-pink-400 tracking-[0.2em]">Her Note</label>
                                        <textarea
                                            value={m.note_her || ''}
                                            onChange={(e) => { update(m.id, 'note_her', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-pink-200 transition-all font-serif italic resize-none overflow-hidden"
                                            placeholder="Add her note..."
                                            rows={1}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ))}
            </div>

            {memories.length === 0 && (
                <div className="text-center py-16 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
                    <BsImages className="text-4xl text-stone-200 mx-auto mb-4" />
                    <p className="font-serif italic text-stone-400 text-lg">No moments captured yet</p>
                    <p className="text-xs text-stone-300 mt-2 uppercase tracking-widest">Upload photos to start building your gallery</p>
                </div>
            )}
        </div>
    );
};

export default Admin;
