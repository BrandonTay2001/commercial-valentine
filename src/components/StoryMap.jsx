import React, { useRef, useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { FaHeart, FaTimes } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import PhotoJournal from './PhotoJournal';
import 'mapbox-gl/dist/mapbox-gl.css';

const ITEM_HEIGHT = 120;

const StoryMap = ({ mapStylePreset }) => {
    const mapRef = useRef(null);
    const [checkpoints, setCheckpoints] = useState([]);
    const [activeCheckpoint, setActiveCheckpoint] = useState(0);
    const [loading, setLoading] = useState(true);
    const [journalOpen, setJournalOpen] = useState(false);
    const [viewState, setViewState] = useState({
        latitude: 0,
        longitude: 0,
        zoom: 2
    });

    useEffect(() => {
        fetchCheckpoints();
    }, []);

    const fetchCheckpoints = async () => {
        const { data, error } = await supabase
            .from('checkpoints')
            .select('*')
            .order('order_index', { ascending: true });

        if (!error && data && data.length > 0) {
            setCheckpoints(data);
            setViewState({
                latitude: data[0].latitude,
                longitude: data[0].longitude,
                zoom: data[0].zoom || 13
            });
        }
        setLoading(false);
    };

    const flyToLocation = (index) => {
        // Strict Bounds Check
        if (index < 0) index = 0;
        if (index >= checkpoints.length) index = checkpoints.length - 1;

        if (!mapRef.current || !checkpoints[index]) return;

        setActiveCheckpoint(index);
        setJournalOpen(false);

        const target = checkpoints[index];
        const map = mapRef.current.getMap();
        map.flyTo({
            center: [target.longitude, target.latitude],
            zoom: target.zoom || 13,
            speed: 1.5,
            curve: 1.5,
            easing: (t) => t,
            essential: true
        });
    };

    // "Remote Control" Drag Logic
    // Instead of dragging the list, we drag an invisible proxy that updates the state
    const handleDragEnd = (_, info) => {
        const { offset, velocity } = info;
        const swipeThreshold = 50;

        // Hand-off Logic (Explicit)
        if (activeCheckpoint === 0 && offset.y > 100) {
            document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (activeCheckpoint === checkpoints.length - 1 && offset.y < -100) {
            document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // Logic: Swipe Down (Positive Y) -> Previous Item
        // Logic: Swipe Up (Negative Y) -> Next Item
        if (offset.y > swipeThreshold || velocity.y > 300) {
            if (activeCheckpoint > 0) {
                flyToLocation(activeCheckpoint - 1);
            }
        } else if (offset.y < -swipeThreshold || velocity.y < -300) {
            if (activeCheckpoint < checkpoints.length - 1) {
                flyToLocation(activeCheckpoint + 1);
            }
        }
    };

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-stone-50">
            <div className="text-display italic text-2xl animate-pulse text-stone-300">Loading Our Journey...</div>
        </div>
    );

    const currentCp = checkpoints[activeCheckpoint];

    const MAP_STYLE = mapStylePreset || "mapbox://styles/mapbox/light-v11";
    const isDarkStyle = MAP_STYLE.includes('dark') || MAP_STYLE.includes('satellite');

    // Dynamic Theme Colors
    const theme = {
        textPrimary: isDarkStyle ? 'text-white' : 'text-primary',
        textSecondary: isDarkStyle ? 'text-stone-300' : 'text-secondary',
        textMuted: isDarkStyle ? 'text-white/40' : 'text-stone-400',
        border: isDarkStyle ? 'border-white/10' : 'border-stone-100',
        borderActive: 'border-red-400',
        glass: isDarkStyle ? 'bg-black/40 border-white/10' : 'bg-white/10 border-white/20',
        gradientFrom: isDarkStyle ? 'from-stone-900/90' : 'from-white/90',
        gradientVia: isDarkStyle ? 'via-stone-900/40' : 'via-white/20',
        gradientMobile: isDarkStyle ? 'from-stone-900/60' : 'from-white/60',
        markerInactive: isDarkStyle ? 'text-white/30' : 'text-stone-300'
    };

    return (
        <section id="map" className={`snap-section relative w-full h-full overflow-hidden transition-colors duration-1000 ${isDarkStyle ? 'bg-stone-900' : 'bg-white'}`}>
            {/* Map Container */}
            <div className="absolute inset-0 z-0">
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle={MAP_STYLE}
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                    dragRotate={false}
                >
                    {checkpoints.map((site, index) => (
                        <Marker
                            key={site.id}
                            longitude={site.longitude}
                            latitude={site.latitude}
                            anchor="bottom"
                        >
                            <div
                                onClick={() => flyToLocation(index)}
                                className={`text-3xl cursor-pointer transition-transform duration-500 ${activeCheckpoint === index ? 'scale-125 text-red-500' : `scale-100 ${theme.markerInactive} opacity-60`}`}
                            >
                                <FaHeart className="drop-shadow-lg" />
                            </div>
                        </Marker>
                    ))}
                </Map>
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-r ${theme.gradientFrom} ${theme.gradientVia} to-transparent md:block hidden`} />
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-b ${theme.gradientMobile} via-transparent ${theme.gradientMobile} md:hidden block`} />
            </div>

            {/* Wheel Scroller UI */}
            <div className="absolute left-0 md:left-20 top-1/2 -translate-y-1/2 z-20 w-full md:w-80 h-[400px] overflow-hidden select-none touch-none">
                {/* Visual Midline */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-red-400/20 z-0 pointer-events-none md:block hidden"></div>

                {/* The List (Controlled by State, Not Drag) */}
                <motion.div
                    className="absolute top-1/2 left-0 w-full"
                    initial={false}
                    animate={{ y: -activeCheckpoint * ITEM_HEIGHT }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {checkpoints.map((point, idx) => {
                        const isActive = activeCheckpoint === idx;
                        return (
                            <motion.div
                                key={point.id}
                                className={`h-[120px] flex flex-col justify-center px-10 md:pl-8 md:pr-0 border-l-4 md:border-l-2 transition-all cursor-pointer ${isActive ? 'border-red-400 opacity-100' : `${theme.border} opacity-20`}`}
                                onClick={() => flyToLocation(idx)}
                                animate={{
                                    scale: isActive ? 1.05 : 0.9,
                                    x: isActive ? (window.innerWidth < 768 ? 20 : 10) : 0,
                                    opacity: isActive ? 1 : 0.3
                                }}
                            >
                                <h4 className={`font-serif text-3xl md:text-3xl lg:text-4xl leading-tight ${isActive ? theme.textPrimary : theme.textMuted}`}>
                                    {point.title}
                                </h4>
                                <p className={`text-xs md:text-sm ${theme.textSecondary} font-mono mb-1 tracking-widest`}>{point.date}</p>

                                {isActive && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={(e) => { e.stopPropagation(); setJournalOpen(true); }}
                                        className="mt-3 text-[10px] md:text-xs uppercase tracking-[0.3em] text-red-500 font-bold hover:text-red-600 transition-colors flex items-center gap-2"
                                    >
                                        Explore Moments →
                                    </motion.button>
                                )}
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* INVISIBLE DRAG OVERLAY - The "Drivers Seat" */}
                <motion.div
                    className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0}
                    onDragEnd={handleDragEnd}
                    style={{ opacity: 0 }}
                />

                {/* Fade Masks */}
                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${isDarkStyle ? 'from-stone-900' : 'from-white'} via-transparent to-transparent pointer-events-none`} />
                <div className={`absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t ${isDarkStyle ? 'from-stone-900' : 'from-white'} via-transparent to-transparent pointer-events-none`} />
            </div>

            {/* Desktop Description Panel (Right) */}
            <AnimatePresence>
                {!journalOpen && currentCp && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className={`absolute right-10 top-1/2 -translate-y-1/2 w-80 backdrop-blur-md border rounded-3xl p-10 z-20 hidden lg:block ${theme.glass}`}
                    >
                        <h3 className={`text-display text-4xl mb-4 leading-tight ${theme.textPrimary}`}>{currentCp.title}</h3>
                        <p className={`font-serif italic text-lg mb-8 leading-relaxed ${theme.textSecondary}`}>
                            "{currentCp.description}"
                        </p>
                        <div className={`w-16 h-1 rounded-full ${isDarkStyle ? 'bg-white/10' : 'bg-stone-100'}`} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Photo Journal Overlay */}
            <AnimatePresence>
                {journalOpen && currentCp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-0 md:p-10"
                    >
                        <div className="absolute inset-0 bg-stone-50/95 md:bg-stone-50/80 backdrop-blur-2xl" onClick={() => setJournalOpen(false)} />

                        <div className="relative w-full h-full max-w-7xl glass-panel-flat md:glass-panel shadow-2xl overflow-y-auto p-8 md:p-16 custom-scrollbar">
                            <button
                                onClick={() => setJournalOpen(false)}
                                className="fixed top-6 right-6 p-4 bg-white shadow-xl rounded-full hover:bg-stone-50 transition-all z-[70] active:scale-95 text-stone-900"
                            >
                                <FaTimes className="text-xl" />
                            </button>

                            <div className="text-center mb-12 md:mb-20">
                                <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] font-sans text-accent/60 mb-4">Our Chapter in</p>
                                <h2 className="text-5xl md:text-7xl lg:text-9xl text-display text-primary leading-[1.1]">{currentCp.title}</h2>
                                {currentCp.description && (
                                    <p className="mt-8 text-secondary italic font-serif text-lg md:text-xl max-w-2xl mx-auto opacity-60 leading-relaxed">
                                        "{currentCp.description}"
                                    </p>
                                )}
                            </div>

                            <PhotoJournal checkpointId={currentCp.id} isPage={true} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default StoryMap;
