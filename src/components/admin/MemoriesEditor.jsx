import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsArrowLeft, BsImages, BsUpload, BsTrash } from 'react-icons/bs';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageCompression';

const MemoriesEditor = ({ checkpointId, coupleId = null }) => {
    const [memories, setMemoriesState] = useState([]);
    const memoriesRef = useRef([]); // Always keep latest memories here

    // Synced setter
    const setMemories = (newVal) => {
        const val = typeof newVal === 'function' ? newVal(memories) : newVal;
        memoriesRef.current = val;
        setMemoriesState(val);
    };

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [flippedCards, setFlippedCards] = useState({});

    const [draggedId, setDraggedId] = useState(null);
    const draggingRef = useRef(false); // Track drag state independent of React render cycle

    const [columns, setColumns] = useState(3);
    const saveTimeoutRef = useRef({});

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 768) setColumns(1);
            else if (width < 1024) setColumns(2);
            else setColumns(3);
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    // Robust Save & Cleanup Function
    const finishDrag = async () => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setDraggedId(null);

        // Save order using the REF to ensure we have the latest reordered list
        const currentMemories = memoriesRef.current;
        if (currentMemories.length === 0) return;

        try {
            // Prepare batch upsert with all fields to satisfy constraints
            const updates = currentMemories.map((m, i) => ({ ...m, order_index: i }));

            const { error } = await supabase.from('memories').upsert(updates, { onConflict: 'id' });
            if (error) throw error;
        } catch (err) {
            console.error('Failed to save order:', err);
            // Optional: visual feedback for error
        }
    };

    // Global fail-safe for drag operations
    useEffect(() => {
        const globalEnd = () => finishDrag();
        window.addEventListener('dragend', globalEnd);
        window.addEventListener('mouseup', globalEnd);
        const handleKey = (e) => { if (e.key === 'Escape') globalEnd(); };
        window.addEventListener('keyup', handleKey);

        return () => {
            window.removeEventListener('dragend', globalEnd);
            window.removeEventListener('mouseup', globalEnd);
            window.removeEventListener('keyup', handleKey);
        };
    }, []);

    const getDistributedMemories = () => {
        const dist = Array.from({ length: columns }, () => []);
        memories.forEach((memory, index) => {
            dist[index % columns].push(memory);
        });
        return dist;
    };

    const fetchMemories = React.useCallback(async () => {
        setLoading(true);
        let query = supabase.from('memories').select('*').eq('checkpoint_id', checkpointId);

        // Filter by couple_id if provided (for multi-user support)
        if (coupleId) {
            query = query.eq('couple_id', coupleId);
        }

        const { data } = await query.order('order_index', { ascending: true });
        if (data) setMemories(data);
        setLoading(false);
    }, [checkpointId, coupleId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchMemories();
    }, [fetchMemories]);

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
                    order_index: memories.length + index,
                    ...(coupleId && { couple_id: coupleId })
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



    const handleDragStart = (id) => {
        draggingRef.current = true;
        setDraggedId(id);
    };

    const handleDragOver = (e, targetId) => {
        e.preventDefault();
        // If we lost drag state (e.g. global listener fired early), abort
        if (!draggingRef.current) return;

        // Use state for visual feedback, but logic acts on ref if needed to be synchronous? 
        // Actually, logic updates state+ref.
        if (draggedId !== null && draggedId !== targetId) {
            const draggedIndex = memories.findIndex(m => m.id === draggedId);
            const targetIndex = memories.findIndex(m => m.id === targetId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const newMemories = [...memories];
                const [removed] = newMemories.splice(draggedIndex, 1);
                newMemories.splice(targetIndex, 0, removed);
                setMemories(newMemories);
            }
        }
    };

    const handleDragEnd = async () => {
        await finishDrag();
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

            {/* Manual Masonry Grid with Flip Cards */}
            <div className="flex flex-row gap-6 items-start pb-10">
                {getDistributedMemories().map((colMemories, colIndex) => (
                    <div key={colIndex} className="flex flex-col gap-6 flex-1 min-w-0">
                        {colMemories.map(m => (
                            <div
                                key={m.id}
                                draggable={!flippedCards[m.id]}
                                onDragStart={() => !flippedCards[m.id] && handleDragStart(m.id)}
                                onDragOver={(e) => !flippedCards[m.id] && handleDragOver(e, m.id)}
                                onDragEnd={handleDragEnd}
                                className={`relative transition-opacity transition-transform duration-200 ${!flippedCards[m.id] ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedId === m.id ? 'opacity-50 scale-95' : ''}`}
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

export default MemoriesEditor;
