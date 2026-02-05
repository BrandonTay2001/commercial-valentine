import React from 'react';

const AdminField = ({ label, value, onChange, type = "text", placeholder = "", error = null }) => (
    <div className="space-y-2">
        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">{label}</label>
        <input
            type={type}
            step="any"
            className={`w-full bg-stone-50 border rounded-2xl px-6 py-3.5 outline-none focus:bg-white transition-all font-medium text-primary shadow-sm ${error
                    ? 'border-amber-300 focus:border-amber-400 bg-amber-50/30'
                    : 'border-stone-100 focus:border-red-100'
                }`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

export default AdminField;

