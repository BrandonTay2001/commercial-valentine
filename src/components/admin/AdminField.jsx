import React from 'react';

const AdminField = ({ label, value, onChange, type = "text", placeholder = "" }) => (
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

export default AdminField;
