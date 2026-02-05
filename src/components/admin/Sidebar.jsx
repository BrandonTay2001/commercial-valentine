import React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { BsShieldLock, BsGearWideConnected, BsGripVertical, BsPlus } from 'react-icons/bs';
import { supabase } from '../../lib/supabase';

const Sidebar = ({
    sidebarOpen,
    activeTab,
    setActiveTab,
    checkpoints,
    handleReorder,
    selectedCpIndex,
    setSelectedCpIndex,
    setCheckpoints,
    setSidebarOpen,
    navigate,
    couple = null,
    onLogout = null
}) => {
    return (
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
                        <button onClick={onLogout || (() => { sessionStorage.removeItem('isAuthenticated'); navigate('/login'); })} className="text-stone-300 hover:text-red-400 transition-colors"><BsShieldLock /></button>
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
                                    date_visited: null,
                                    description: '',
                                    latitude: 0,
                                    longitude: 0,
                                    order_index: checkpoints.length,
                                    ...(couple?.id && { couple_id: couple.id })
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
    );
};

export default Sidebar;
