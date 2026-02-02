import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft, BsMap, BsImages, BsSave, BsPlus, BsTrash, BsShieldLock, BsUpload } from 'react-icons/bs';
import { supabase } from '../lib/supabase';

const Admin = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('locations');
    const [checkpoints, setCheckpoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCpIndex, setSelectedCpIndex] = useState(0);

    useEffect(() => {
        const isAuth = localStorage.getItem('isAuthenticated');
        if (!isAuth) navigate('/login');
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('checkpoints').select('*').order('order_index', { ascending: true });
        if (data) setCheckpoints(data);
        setLoading(false);
    };

    const saveAll = async () => {
        const { error } = await supabase.from('checkpoints').upsert(checkpoints.map((cp, i) => ({ ...cp, order_index: i })));
        if (!error) alert('Checkpoints saved!');
        else alert('Error saving checkpoints.');
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading Studio...</div>;

    return (
        <div className="min-h-screen bg-stone-100 flex pb-20">
            {/* Sidebar */}
            <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-stone-200 flex flex-col pt-10 sticky top-0 h-screen">
                <div className="px-8 mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="font-serif italic text-2xl text-primary">Studio</h1>
                        <p className="text-[10px] uppercase tracking-widest text-accent">Admin Studio</p>
                    </div>
                    <button onClick={() => { localStorage.removeItem('isAuthenticated'); navigate('/login'); }} className="text-red-300 hover:text-red-500"><BsShieldLock /></button>
                </div>

                <div className="px-4 space-y-1 mb-8">
                    <p className="px-4 text-[10px] uppercase font-bold text-stone-400 mb-2">Locations</p>
                    {checkpoints.map((cp, i) => (
                        <button
                            key={cp.id || i}
                            onClick={() => { setSelectedCpIndex(i); setActiveTab('editor'); }}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${selectedCpIndex === i && activeTab === 'editor' ? 'bg-primary text-white' : 'hover:bg-stone-50 text-secondary'}`}
                        >
                            <span className="truncate pr-2">{cp.title || '(Untitled)'}</span>
                            {selectedCpIndex === i && activeTab === 'editor' && <div className="w-1.5 h-1.5 bg-red-300 rounded-full" />}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            const newCp = { title: 'New Spot', date: '', description: '', latitude: 0, longitude: 0, zoom: 13, order_index: checkpoints.length };
                            setCheckpoints([...checkpoints, newCp]);
                            setSelectedCpIndex(checkpoints.length);
                            setActiveTab('editor');
                        }}
                        className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-50 rounded-xl flex items-center gap-2 text-sm font-medium"
                    >
                        <BsPlus className="text-xl" /> New Location
                    </button>
                </div>

                <div className="mt-auto p-6">
                    <button onClick={saveAll} className="w-full glass-capsule bg-primary text-white py-3 flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                        <BsSave /> Save All Changes
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-10 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    {checkpoints[selectedCpIndex] ? (
                        <div className="space-y-12">
                            {/* Checkpoint Details */}
                            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm relative group">
                                <div className="flex justify-between mb-8">
                                    <h2 className="text-3xl font-serif text-primary">Location Details</h2>
                                    <button
                                        onClick={() => {
                                            const id = checkpoints[selectedCpIndex].id;
                                            if (id) supabase.from('checkpoints').delete().eq('id', id).then(() => fetchData());
                                            else setCheckpoints(checkpoints.filter((_, i) => i !== selectedCpIndex));
                                        }}
                                        className="text-stone-300 hover:text-red-400 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <BsTrash /> Delete Location
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <Field label="Title" value={checkpoints[selectedCpIndex].title} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].title = v; setCheckpoints(next);
                                    }} />
                                    <Field label="Date" value={checkpoints[selectedCpIndex].date} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].date = v; setCheckpoints(next);
                                    }} />
                                    <Field label="Latitude" type="number" value={checkpoints[selectedCpIndex].latitude} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].latitude = parseFloat(v); setCheckpoints(next);
                                    }} />
                                    <Field label="Longitude" type="number" value={checkpoints[selectedCpIndex].longitude} onChange={(v) => {
                                        const next = [...checkpoints]; next[selectedCpIndex].longitude = parseFloat(v); setCheckpoints(next);
                                    }} />
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-accent">Story / Description</label>
                                        <textarea
                                            className="w-full bg-stone-50 border-none rounded-2xl px-5 py-4 outline-none h-32 resize-none"
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
                                <div className="bg-stone-50 border-2 border-dashed border-stone-200 p-10 rounded-2xl text-center text-stone-400 font-serif">
                                    Please save the location first to start adding photos.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-[60vh] flex items-center justify-center text-stone-300 flex-col gap-4">
                            <BsMap className="text-6xl opacity-20" />
                            <p className="font-serif italic text-xl">Select a location to edit</p>
                        </div>
                    )}
                </div>
            </div>

            <button onClick={() => navigate('/')} className="fixed bottom-8 right-8 p-3 bg-white rounded-full shadow-lg border border-stone-200 text-accent hover:text-primary transition-all hover:scale-110 z-50">
                <BsArrowLeft className="text-xl" />
            </button>
        </div>
    );
};

const Field = ({ label, value, onChange, type = "text" }) => (
    <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-accent">{label}</label>
        <input type={type} step="any" className="w-full bg-stone-50 border-none rounded-xl px-5 py-3 outline-none focus:bg-stone-100 transition-all font-medium" value={value} onChange={(e) => onChange(e.target.value)} />
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
        if (error) { alert('Upload error. check bucket settings.'); setUploading(false); return; }
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
        await supabase.from('memories').delete().eq('id', id);
        setMemories(memories.filter(m => m.id !== id));
    };

    if (loading) return <div>Loading Journal...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif text-primary">Photos & Notes</h2>
                <label className={`glass-capsule cursor-pointer bg-stone-200 hover:bg-stone-300 transition-all px-6 py-2 flex items-center gap-2 text-sm font-medium ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <BsUpload /> {uploading ? 'Uploading...' : 'Add Memory'}
                    <input type="file" className="hidden" onChange={upload} accept="image/*" />
                </label>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {memories.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm group relative">
                        <button onClick={() => remove(m.id)} className="absolute top-4 right-4 text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"><BsTrash /></button>
                        <div className="aspect-video bg-stone-50 rounded-2xl overflow-hidden mb-6">
                            <img src={m.image_url} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-blue-300 tracking-widest">His Note</label>
                                <input type="text" value={m.note_him} onChange={(e) => update(m.id, 'note_him', e.target.value)} className="w-full bg-stone-50 border-none rounded-xl px-4 py-2 text-sm outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-pink-300 tracking-widest">Her Note</label>
                                <input type="text" value={m.note_her} onChange={(e) => update(m.id, 'note_her', e.target.value)} className="w-full bg-stone-50 border-none rounded-xl px-4 py-2 text-sm outline-none" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Admin;
