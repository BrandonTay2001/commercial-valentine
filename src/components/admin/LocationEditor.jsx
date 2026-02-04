import React from 'react';
import { BsMap, BsTrash } from 'react-icons/bs';
import { supabase } from '../../lib/supabase';
import AdminField from './AdminField';
import AddressSearch from './AddressSearch';
import MemoriesEditor from './MemoriesEditor';

const LocationEditor = ({
    checkpoint,
    updateCheckpoint,
    autoSaveCheckpoint,
    fetchData,
    checkpoints,
    setCheckpoints,
    selectedCpIndex,
    // dbDelete // Pass a callback or handle delete inside
}) => {
    // If no checkpoint selected, show placeholder
    if (!checkpoint) {
        return (
            <div className="h-[60vh] flex items-center justify-center text-stone-200 flex-col gap-6">
                <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center animate-pulse">
                    <BsMap className="text-4xl opacity-30" />
                </div>
                <p className="font-serif italic text-xl">Select a chapter from the sidebar</p>
            </div>
        );
    }

    return (
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
                            const id = checkpoint.id;
                            if (id) {
                                if (window.confirm('Delete this location and all its photos?')) {
                                    supabase.from('checkpoints').delete().eq('id', id).then(() => fetchData());
                                }
                            } else {
                                // Just remove from local state if not saved yet
                                setCheckpoints(checkpoints.filter((_, i) => i !== selectedCpIndex));
                            }
                        }}
                        className="text-stone-300 hover:text-red-400 transition-all flex items-center gap-2 text-xs uppercase tracking-widest font-bold"
                    >
                        <BsTrash /> Remove chapter
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <AdminField label="Location Name" value={checkpoint.title} onChange={(v) => updateCheckpoint(selectedCpIndex, 'title', v)} />
                    <AdminField label="Map Marker Label" value={checkpoint.marker_label || ''} onChange={(v) => updateCheckpoint(selectedCpIndex, 'marker_label', v)} placeholder="Short name for map pin" />
                    <AdminField label="Special Date" value={checkpoint.date} onChange={(v) => updateCheckpoint(selectedCpIndex, 'date', v)} />
                    <div className="col-span-1 md:col-span-2">
                        <AddressSearch
                            latitude={checkpoint.latitude}
                            longitude={checkpoint.longitude}
                            address={checkpoint.address || ''}
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
                            value={checkpoint.description}
                            onChange={(e) => updateCheckpoint(selectedCpIndex, 'description', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Photo Journal Editor */}
            {checkpoint.id ? (
                <MemoriesEditor checkpointId={checkpoint.id} />
            ) : (
                <div className="bg-stone-100/50 border-2 border-dashed border-stone-200 p-12 rounded-[2.5rem] text-center">
                    <p className="font-serif italic text-stone-400 mb-4 text-xl">Almost there!</p>
                    <p className="text-sm text-stone-400">Save this location first to start adding photos.</p>
                </div>
            )}
        </div>
    );
};

export default LocationEditor;
