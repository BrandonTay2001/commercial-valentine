import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaReply } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const PhotoCard = ({ photo }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="relative mb-3 md:mb-6 break-inside-avoid cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="relative w-full"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front - The Image */}
                <div
                    className="w-full relative overflow-hidden rounded-2xl shadow-lg group"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <img
                        src={photo.image_url}
                        alt="Memory"
                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <span className="text-white text-xs font-mono uppercase tracking-widest backdrop-blur-sm px-2 py-1 rounded border border-white/30">
                            Open Note
                        </span>
                    </div>
                </div>

                {/* Back - The Notes */}
                <div
                    className="absolute inset-0 rounded-2xl p-6 bg-white/95 backdrop-blur-xl border border-white/50 shadow-inner flex flex-col justify-center overflow-hidden"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#001 1px, transparent 1px)', backgroundSize: '100% 24px' }}></div>

                    <div className="relative z-10 space-y-4">
                        {photo.note_him && (
                            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 rotate-1 shadow-sm">
                                <p className="text-[0.6rem] uppercase tracking-widest text-blue-400 font-bold mb-1">His Note</p>
                                <p className="font-serif text-gray-700 italic text-sm">"{photo.note_him}"</p>
                            </div>
                        )}

                        {photo.note_her && (
                            <div className="bg-pink-50/70 p-4 rounded-xl border border-pink-100 -rotate-1 shadow-sm">
                                <p className="text-[0.6rem] uppercase tracking-widest text-pink-400 font-bold mb-1">Her Note</p>
                                <p className="font-serif text-gray-700 italic text-sm">"{photo.note_her}"</p>
                            </div>
                        )}

                        {!photo.note_him && !photo.note_her && (
                            <p className="text-center text-stone-400 font-serif italic">Just a beautiful moment.</p>
                        )}
                    </div>

                    <div className="absolute bottom-4 right-4 text-stone-300">
                        <FaReply />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const PhotoJournal = ({ checkpointId = null, isPage = false }) => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMemories = async () => {
            setLoading(true);
            let query = supabase.from('memories').select('*').order('order_index', { ascending: true });

            if (checkpointId) {
                query = query.eq('checkpoint_id', checkpointId);
            }

            const { data, error } = await query;

            if (!error && data) {
                setMemories(data);
            }
            setLoading(false);
        };

        fetchMemories();
    }, [checkpointId]);

    if (loading) return (
        <div className="py-20 flex flex-col items-center justify-center space-y-4 text-stone-300">
            <div className="w-8 h-8 border-2 border-stone-200 border-t-red-400 rounded-full animate-spin" />
            <p className="font-display italic">Curating moments...</p>
        </div>
    );

    return (
        <div className={`w-full ${isPage ? '' : 'snap-section'}`}>
            {memories.length > 0 ? (
                <div className="columns-2 md:columns-3 gap-3 w-full pb-20 space-y-3">
                    {memories.map(photo => (
                        <PhotoCard key={photo.id} photo={photo} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
                    <p className="font-serif italic text-stone-400 text-xl">No photos captured here yet.</p>
                    <p className="text-xs text-stone-300 mt-2 uppercase tracking-widest">Memories are waiting to be added</p>
                </div>
            )}
        </div>
    );
};

export default PhotoJournal;
