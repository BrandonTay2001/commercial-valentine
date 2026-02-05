import React, { useState, useMemo } from 'react';
import { BsMap, BsTrash, BsCheckCircle, BsExclamationTriangle } from 'react-icons/bs';
import { supabase } from '../../lib/supabase';
import AdminField from './AdminField';
import AddressSearch from './AddressSearch';
import MemoriesEditor from './MemoriesEditor';

const LocationEditor = ({
    checkpoint,
    updateCheckpoint,
    saveCheckpoint,
    validateCheckpoint,
    fetchData,
    checkpoints,
    setCheckpoints,
    selectedCpIndex,
    coupleId = null,
}) => {
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errors, setErrors] = useState({});

    // Real-time validation for showing warnings
    const validationWarnings = useMemo(() => {
        if (!checkpoint) return {};
        return validateCheckpoint(checkpoint);
    }, [checkpoint, validateCheckpoint]);

    const handleSave = async () => {
        if (!checkpoint) return;

        // Validate required fields before saving
        const validationErrors = {};

        if (!checkpoint.title || checkpoint.title.trim() === '') {
            validationErrors.title = 'Location name is required';
        }

        // Check if coordinates are provided (required for map display)
        // Also reject (0, 0) as those are default values
        const hasValidCoordinates = checkpoint.latitude != null &&
            checkpoint.longitude != null &&
            !(checkpoint.latitude === 0 && checkpoint.longitude === 0);

        if (!hasValidCoordinates) {
            validationErrors.coordinates = 'Location coordinates are required';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors({ general: 'Please fill in all required fields: Location Name and Address' });
            return;
        }

        setSaving(true);
        setErrors({});
        setSaveSuccess(false);

        const result = await saveCheckpoint(checkpoint);

        if (result.success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } else {
            setErrors(result.errors);
        }

        setSaving(false);
    };

    const hasValidationWarnings = Object.keys(validationWarnings).length > 0;

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
                    <div>
                        <AdminField
                            label="Location Name"
                            value={checkpoint.title}
                            onChange={(v) => updateCheckpoint(selectedCpIndex, 'title', v)}
                            error={validationWarnings.title}
                        />
                        {validationWarnings.title && (
                            <p className="text-amber-500 text-xs mt-1 flex items-center gap-1 ml-2">
                                <BsExclamationTriangle className="flex-shrink-0" />
                                {validationWarnings.title}
                            </p>
                        )}
                    </div>
                    {/* <AdminField label="Map Marker Label" value={checkpoint.marker_label || ''} onChange={(v) => updateCheckpoint(selectedCpIndex, 'marker_label', v)} placeholder="Short name for map pin" /> */}
                    <AdminField label="Special Date" type="date" value={checkpoint.date_visited || ''} onChange={(v) => updateCheckpoint(selectedCpIndex, 'date_visited', v)} />
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
                            }}
                        />
                        {(validationWarnings.latitude || validationWarnings.longitude) && (
                            <p className="text-amber-500 text-xs mt-2 flex items-center gap-1 ml-2">
                                <BsExclamationTriangle className="flex-shrink-0" />
                                {validationWarnings.latitude || validationWarnings.longitude}
                            </p>
                        )}
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

                {/* Validation Errors */}
                {errors.general && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
                        <p className="text-red-500 text-sm flex items-center gap-2">
                            <BsExclamationTriangle />
                            {errors.general}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex justify-between items-center">
                    <button
                        onClick={() => {
                            const memoriesSection = document.querySelector('.memories-editor-section');
                            if (memoriesSection) {
                                memoriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}
                        className="px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-2 bg-stone-900/20 text-stone-700 hover:bg-stone-900/30 backdrop-blur-sm"
                    >
                        Upload Memories
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-3 ${saveSuccess
                            ? 'bg-green-500 text-white'
                            : hasValidationWarnings
                                ? 'bg-amber-50 text-amber-600 border-2 border-amber-200 hover:bg-amber-100'
                                : 'bg-primary text-white hover:bg-primary/90'
                            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <BsCheckCircle className="text-lg" />
                                Saved!
                            </>
                        ) : hasValidationWarnings ? (
                            <>
                                <BsExclamationTriangle className="text-lg" />
                                Save Location (Fix warnings first)
                            </>
                        ) : (
                            'Save Location'
                        )}
                    </button>
                </div>
            </div>

            {/* Photo Journal Editor */}
            {checkpoint.id ? (
                <div className="memories-editor-section">
                    <MemoriesEditor checkpointId={checkpoint.id} coupleId={coupleId} />
                </div>
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
