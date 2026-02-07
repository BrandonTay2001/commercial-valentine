import React from 'react';
import { BsExclamationTriangle } from 'react-icons/bs';

const UnsavedChangesDialog = ({ isOpen, onSave, onDiscard, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-stone-100">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                        <BsExclamationTriangle className="text-2xl text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-serif text-primary mb-2">Unsaved Changes</h3>
                        <p className="text-stone-500 text-sm">
                            You have unsaved changes that will be lost if you continue.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onSave}
                        className="flex-1 px-6 py-3 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all"
                    >
                        Save Changes
                    </button>
                    <button
                        onClick={onDiscard}
                        className="flex-1 px-6 py-3 bg-red-50 text-red-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-all"
                    >
                        Discard
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-3 bg-stone-100 text-stone-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-200 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesDialog;
