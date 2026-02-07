import React, { useState } from 'react';
import { BsGearWideConnected, BsUpload, BsTrash, BsCheckCircle } from 'react-icons/bs';
import AdminField from './AdminField';
import { supabase } from '../../lib/supabase';

const SiteSettings = ({
    settings,
    updateSettings,
    saveSettings,
    uploadBg,
    bgUploading,
    optimizing,
    optimizeLibrary,
    optProgress,
    couple = null
}) => {
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        const result = await saveSettings();

        if (result.success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } else {
            setSaveError(result.error);
        }

        setSaving(false);
    };

    return (
        <div className="space-y-8 md:space-y-12">
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 hidden md:block">
                    <BsGearWideConnected className="text-8xl" />
                </div>

                <h2 className="text-3xl font-serif text-primary mb-8">Site Customization</h2>

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AdminField label="Landing Label" value={settings?.hero_label} onChange={(v) => updateSettings('hero_label', v)} />
                        <AdminField label="Landing Title" value={settings?.hero_title} onChange={(v) => updateSettings('hero_title', v)} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Subtext / Quote</label>
                        <textarea
                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-32 resize-none focus:bg-white focus:border-red-100 transition-all"
                            value={settings?.hero_subtext}
                            onChange={(e) => updateSettings('hero_subtext', e.target.value)}
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
                                        onClick={async () => {
                                            // Extract file path from URL
                                            const url = settings.hero_bg_url;
                                            const pathMatch = url.match(/memories\/(.+)$/);
                                            if (pathMatch) {
                                                await supabase.storage.from('memories').remove([pathMatch[1]]);
                                            }
                                            // Clear from database
                                            updateSettings('hero_bg_url', '');
                                        }}
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
                                value={settings?.map_style || 'mapbox://styles/mapbox/dark-v11'}
                                onChange={(e) => updateSettings('map_style', e.target.value)}
                            >
                                <option value="mapbox://styles/mapbox/dark-v11">Elegant Dark</option>
                                <option value="mapbox://styles/mapbox/light-v11">Classic Light</option>
                                <option value="mapbox://styles/mapbox/satellite-v9">Photorealistic Satellite</option>
                                <option value="mapbox://styles/mapbox/streets-v12">Detailed Streets</option>
                                <option value="mapbox://styles/mapbox/outdoors-v12">Outdoor Terrain</option>
                            </select>
                        </div>
                    </div>

                    {/* Map Configuration Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50 p-6 rounded-3xl border border-stone-100">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Zoom Level (Altitude)</label>
                                <span className="text-xs font-mono font-bold text-primary bg-white px-2 py-1 rounded-md border border-stone-100">
                                    {settings?.map_zoom_level || 4}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="18"
                                step="0.5"
                                className="w-full accent-red-400 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                value={settings?.map_zoom_level || 4}
                                onChange={(e) => updateSettings('map_zoom_level', parseFloat(e.target.value))}
                            />
                            <div className="flex justify-between text-[10px] text-stone-400 font-mono px-1">
                                <span>Global (2)</span>
                                <span>Street (18)</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">3D Pitch (Tilt)</label>
                                <span className="text-xs font-mono font-bold text-primary bg-white px-2 py-1 rounded-md border border-stone-100">
                                    {settings?.map_pitch || 30}°
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="60"
                                step="5"
                                className="w-full accent-red-400 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                value={settings?.map_pitch || 30}
                                onChange={(e) => updateSettings('map_pitch', parseFloat(e.target.value))}
                            />
                            <div className="flex justify-between text-[10px] text-stone-400 font-mono px-1">
                                <span>Flat (0°)</span>
                                <span>3D (60°)</span>
                            </div>
                        </div>
                    </div>

                    {/* Blur Intensity Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Background Blur Intensity</label>
                            <span className="text-xs text-stone-400 font-mono">{settings?.hero_blur_amount || 16}px</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="30"
                            value={settings?.hero_blur_amount || 16}
                            onChange={(e) => updateSettings('hero_blur_amount', parseInt(e.target.value))}
                            className="w-full h-2 bg-stone-100 rounded-full appearance-none cursor-pointer accent-red-400"
                        />
                        <div className="flex justify-between text-[9px] text-stone-300 font-mono">
                            <span>Sharp</span>
                            <span>Blurry</span>
                        </div>
                    </div>

                    {/* Text Color Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Text Color (Hero & Footer)</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => updateSettings('text_color', 'white')}
                                className={`flex-1 py-3 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all border ${(settings?.text_color || 'white') === 'white'
                                    ? 'bg-stone-800 text-white border-stone-800'
                                    : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-300'
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-white border border-stone-300" />
                                    White
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => updateSettings('text_color', 'black')}
                                className={`flex-1 py-3 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all border ${settings?.text_color === 'black'
                                    ? 'bg-stone-800 text-white border-stone-800'
                                    : 'bg-stone-50 text-stone-500 border-stone-100 hover:border-stone-300'
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-stone-900 border border-stone-900" />
                                    Black
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <p className="text-[9px] uppercase font-bold text-stone-300 ml-2 mb-2">Preview (Blurred)</p>
                        <div className="w-full h-40 rounded-3xl overflow-hidden relative">
                            <img
                                src={settings?.hero_bg_url || '/default-couple-bg.png'}
                                className="w-full h-full object-cover scale-110 transition-all duration-300"
                                style={{ filter: `blur(${settings?.hero_blur_amount || 16}px)` }}
                            />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className={`absolute inset-0 flex items-center justify-center font-serif italic text-2xl shadow-inner ${(settings?.text_color || 'white') === 'black' ? 'text-black/90' : 'text-white'
                                }`}>
                                {settings?.hero_title || 'Our Story'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Customization */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                <h2 className="text-3xl font-serif text-primary mb-8">Footer Section</h2>

                <div className="space-y-6">
                    <AdminField
                        label="Footer Title"
                        value={settings?.footer_title}
                        onChange={(v) => updateSettings('footer_title', v)}
                        placeholder="To Forever & Beyond"
                    />

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Footer Description</label>
                        <textarea
                            className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-6 py-5 outline-none h-32 resize-none focus:bg-white focus:border-red-100 transition-all"
                            value={settings?.footer_description || ''}
                            onChange={(e) => updateSettings('footer_description', e.target.value)}
                            placeholder="Built with love and shared memories..."
                        />
                    </div>

                    <AdminField
                        label="Footer Caption"
                        value={settings?.footer_caption}
                        onChange={(v) => updateSettings('footer_caption', v)}
                        placeholder="2026 Valentines"
                    />
                </div>
            </div>

            {/* Save Error */}
            {saveError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                    <p className="text-red-500 text-sm">{saveError}</p>
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-3 ${saveSuccess
                        ? 'bg-green-500 text-white'
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
                    ) : (
                        'Save Settings'
                    )}
                </button>
            </div>

            {/* Maintenance Tool */}
            {/* <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                <h2 className="text-3xl font-serif text-primary mb-6">Maintenance</h2>
                <p className="text-sm text-stone-400 mb-6 font-sans">
                    Reduce memory usage by optimizing all existing images in your library.
                </p>

                {optimizing ? (
                    <div className="space-y-4">
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-400 transition-all duration-300"
                                style={{ width: `${(optProgress.current / optProgress.total) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs font-mono text-stone-500">
                            <span>Processing...</span>
                            <span>{optProgress.current} / {optProgress.total}</span>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={optimizeLibrary}
                        disabled={optimizing}
                        className="w-full py-4 bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 font-bold uppercase tracking-widest text-xs rounded-2xl transition-all border border-stone-100 hover:border-red-100"
                    >
                        Optimize Image Library
                    </button>
                )}
            </div> */}
        </div>
    );
};

export default SiteSettings;
