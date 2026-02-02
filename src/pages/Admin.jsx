import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BsArrowLeft, BsMap, BsImages, BsSave, BsPlus,
    BsTrash, BsShieldLock, BsUpload, BsMenuButtonWide,
    BsX, BsGearWideConnected
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

    useEffect(() => {
        const isAuth = localStorage.getItem('isAuthenticated');
        if (!isAuth) navigate('/login');
        fetchData();
    }, [navigate]);

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
        setSettings({ ...settings, hero_bg_url: publicUrl });
        setBgUploading(false);
    };

    const saveAll = async () => {
        // Save locations
        const { error: cpError } = await supabase.from('checkpoints').upsert(checkpoints.map((cp, i) => ({ ...cp, order_index: i })));

        // Save settings
        const { error: settingsError } = await supabase.from('site_settings').update(settings).eq('id', 1);

        if (!cpError && !settingsError) alert('Everything saved successfully! ❤️');
        else alert('Error saving data. Check console.');
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
                <button onClick={saveAll} className="bg-primary text-white p-2 rounded-lg shadow-sm"><BsSave /></button>
            </div>

            {/* Sidebar */}
            <AnimatePresence>
                {(sidebarOpen || window.innerWidth >= 768) && (
                    <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full md:w-80 bg-white border-r border-stone-200 flex flex-col pt-6 md:pt-10 fixed md:sticky top-0 h-full z-50 md:z-auto"
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
                            <p className="px-4 text-[10px] uppercase font-bold text-stone-300 mb-2 tracking-widest">Chapters</p>
                            {checkpoints.map((cp, i) => (
                                <button
                                    key={cp.id || i}
                                    onClick={() => {
                                        setSelectedCpIndex(i);
                                        setActiveTab('locations');
                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-5 py-3.5 rounded-2xl transition-all flex items-center justify-between group ${activeTab === 'locations' && selectedCpIndex === i ? 'bg-stone-100 text-primary font-medium' : 'hover:bg-stone-50 text-stone-400'}`}
                                >
                                    <span className="truncate pr-2">{cp.title || '(Untitled)'}</span>
                                    {activeTab === 'locations' && selectedCpIndex === i && <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    const newCp = { title: 'New Spot', date: '', description: '', latitude: 0, longitude: 0, zoom: 13, order_index: checkpoints.length };
                                    setCheckpoints([...checkpoints, newCp]);
                                    setSelectedCpIndex(checkpoints.length);
                                    setActiveTab('locations');
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
                            <button onClick={saveAll} className="w-full bg-stone-900 text-white rounded-[1.5rem] py-4 flex items-center justify-center gap-3 hover:bg-black shadow-lg hover:shadow-xl transition-all font-bold text-sm">
                                <BsSave className="text-red-400" /> Save Everything
                            </button>
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
                                        <Field label="Landing Label" value={settings?.hero_label} onChange={(v) => setSettings({ ...settings, hero_label: v })} />
                                        <Field label="Landing Title" value={settings?.hero_title} onChange={(v) => setSettings({ ...settings, hero_title: v })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Subtext / Quote</label>
                                        <textarea
                                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-32 resize-none focus:bg-white focus:border-red-100 transition-all"
                                            value={settings?.hero_subtext}
                                            onChange={(e) => setSettings({ ...settings, hero_subtext: e.target.value })}
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
                                                        onClick={() => setSettings({ ...settings, hero_bg_url: '' })}
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
                                                onChange={(e) => setSettings({ ...settings, map_style: e.target.value })}
                                            >
                                                <option value="mapbox://styles/mapbox/light-v11">Classic Light</option>
                                                <option value="mapbox://styles/mapbox/dark-v11">Elegant Dark</option>
                                                <option value="mapbox://styles/mapbox/satellite-v9">Photorealistic Satellite</option>
                                                <option value="mapbox://styles/mapbox/streets-v12">Detailed Streets</option>
                                                <option value="mapbox://styles/mapbox/outdoors-v12">Outdoor Terrain</option>
                                            </select>
                                        </div>
                                    </div>

                                    {settings?.hero_bg_url && (
                                        <div className="mt-4">
                                            <p className="text-[9px] uppercase font-bold text-stone-300 ml-2 mb-2">Preview (Blurred)</p>
                                            <div className="w-full h-40 rounded-3xl overflow-hidden relative">
                                                <img src={settings.hero_bg_url} className="w-full h-full object-cover blur-lg scale-110" />
                                                <div className="absolute inset-0 flex items-center justify-center text-white font-serif italic text-2xl shadow-inner">
                                                    {settings.hero_title}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : checkpoints[selectedCpIndex] ? (
                        <div className="space-y-8 md:space-y-12">
                            {/* Checkpoint Details */}
                            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
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
                                    <Field label="Location Name" value={checkpoints[selectedCpIndex].title} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].title = v; setCheckpoints(next);
                                    }} />
                                    <Field label="Special Date" value={checkpoints[selectedCpIndex].date} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].date = v; setCheckpoints(next);
                                    }} />
                                    <Field label="Latitude" type="number" value={checkpoints[selectedCpIndex].latitude} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].latitude = parseFloat(v); setCheckpoints(next);
                                    }} />
                                    <Field label="Longitude" type="number" value={checkpoints[selectedCpIndex].longitude} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].longitude = parseFloat(v); setCheckpoints(next);
                                    }} />
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Story Fragment</label>
                                        <textarea
                                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-40 resize-none focus:bg-white focus:border-red-100 transition-all"
                                            placeholder="Write about what happened here..."
                                            value={checkpoints[selectedCpIndex].description}
                                            onChange={(e) => {
                                                const next = [...checkpoints]; next[selectedCpIndex].description = e.target.value; setCheckpoints(next);
                                            }}
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

const Field = ({ label, value, onChange, type = "text" }) => (
    <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">{label}</label>
        <input
            type={type}
            step="any"
            className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-3.5 outline-none focus:bg-white focus:border-red-100 transition-all font-medium text-primary shadow-sm"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const MemoriesEditor = ({ checkpointId }) => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

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
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const name = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('memories').upload(name, file);
        if (error) {
            alert('Upload error. ensure bucket "memories" exists and is public.');
            setUploading(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('memories').getPublicUrl(name);

        await supabase.from('memories').insert({ checkpoint_id: checkpointId, image_url: publicUrl, order_index: memories.length });
        fetchMemories();
        setUploading(false);
    };

    const update = async (id, field, value) => {
        await supabase.from('memories').update({ [field]: value }).eq('id', id);
        const next = memories.map(m => m.id === id ? { ...m, [field]: value } : m);
        setMemories(next);
    };

    const remove = async (id) => {
        const memory = memories.find(m => m.id === id);
        if (!memory) return;

        if (window.confirm('Remove this memory forever?')) {
            await supabase.from('memories').delete().eq('id', id);
            setMemories(memories.filter(m => m.id !== id));
        }
    };

    if (loading) return <div className="text-center py-20 font-serif italic text-stone-300">Summoning memories...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-serif text-primary">Moment Gallery</h2>
                <label className={`w-full md:w-auto glass-capsule cursor-pointer bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all px-8 py-3 flex items-center justify-center gap-3 text-sm font-bold text-primary ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <BsUpload className="text-red-400" /> {uploading ? 'Shuffling...' : 'Add a Moment'}
                    <input type="file" className="hidden" onChange={upload} accept="image/*" />
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {memories.map(m => (
                    <div key={m.id} className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm group relative hover:shadow-md transition-all">
                        <button onClick={() => remove(m.id)} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full text-stone-300 hover:text-red-400 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"><BsTrash /></button>
                        <div className="aspect-[4/5] md:aspect-video bg-stone-50 rounded-2xl overflow-hidden mb-5">
                            <img src={m.image_url} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold text-blue-300 tracking-[0.2em] ml-1">His perspective</label>
                                <textarea
                                    value={m.note_him || ''}
                                    onChange={(e) => update(m.id, 'note_him', e.target.value)}
                                    className="w-full bg-stone-50/50 border border-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-50 transition-all h-20 resize-none font-serif italic"
                                    placeholder="Add his note..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold text-pink-300 tracking-[0.2em] ml-1">Her perspective</label>
                                <textarea
                                    value={m.note_her || ''}
                                    onChange={(e) => update(m.id, 'note_her', e.target.value)}
                                    className="w-full bg-stone-50/50 border border-stone-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-pink-50 transition-all h-20 resize-none font-serif italic"
                                    placeholder="Add her note..."
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Admin;
