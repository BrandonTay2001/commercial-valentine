import React, { useRef, useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { FaHeart, FaTimes } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import PhotoJournal from './PhotoJournal';
import 'mapbox-gl/dist/mapbox-gl.css';

const ITEM_HEIGHT = 120;

const StoryMap = () => {
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

    // Fetch checkpoints from Supabase
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
        if (!mapRef.current || !checkpoints[index]) return;
        const target = checkpoints[index];
        setActiveCheckpoint(index);
        setJournalOpen(false);

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

    // Drag constraints for the wheel
    const onDragEnd = (event, info) => {
        const offset = info.offset.y;
        const velocity = info.velocity.y;

        // Simple logic to snap to next/prev checkpoint based on drag distance/velocity
        if (offset < -50 || velocity < -500) {
            if (activeCheckpoint < checkpoints.length - 1) flyToLocation(activeCheckpoint + 1);
        } else if (offset > 50 || velocity > 500) {
            if (activeCheckpoint > 0) flyToLocation(activeCheckpoint - 1);
        }
    };

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-stone-50">
            <div className="text-display italic text-2xl animate-pulse">Loading Our Journey...</div>
        </div>
    );

    const currentCp = checkpoints[activeCheckpoint];

    return (
        <section id="map-section" className="snap-section relative w-full h-full bg-white overflow-hidden">
            {/* Map Container */}
            <div className="absolute inset-0 z-0">
                <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/light-v11"
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
                                className={`text-3xl cursor-pointer transition-transform duration-500 ${activeCheckpoint === index ? 'scale-125 text-red-500' : 'scale-100 text-gray-400 opacity-70'}`}
                            >
                                <FaHeart className="drop-shadow-lg" />
                            </div>
                        </Marker>
                    ))}
                </Map>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-white/80 via-white/20 to-transparent md:block hidden" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/60 via-transparent to-white/60 md:hidden block" />
            </div>

            {/* Wheel Scroller UI - Accessible on Mobile via Drag */}
            <div className="absolute left-4 md:left-20 top-1/2 -translate-y-1/2 z-20 w-[calc(100%-2rem)] md:w-80 h-[360px] md:h-[400px] overflow-hidden rounded-3xl md:rounded-none">
                <div className="absolute top-1/2 left-0 w-full h-px bg-red-300 opacity-20 z-0 pointer-events-none"></div>

                <motion.div
                    className="absolute top-1/2 left-0 w-full cursor-grab active:cursor-grabbing"
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={onDragEnd}
                    animate={{ y: -activeCheckpoint * ITEM_HEIGHT }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {checkpoints.map((point, idx) => {
                        const isActive = activeCheckpoint === idx;
                        return (
                            <motion.div
                                key={point.id}
                                className={`h-[120px] flex flex-col justify-center pl-8 border-l-2 transition-all cursor-pointer ${isActive ? 'border-red-400 opacity-100' : 'border-stone-200 opacity-20 hover:opacity-40'}`}
                                onClick={() => flyToLocation(idx)}
                                animate={{
                                    scale: isActive ? 1.05 : 0.9,
                                    x: isActive ? 10 : 0,
                                    opacity: isActive ? 1 : 0.3
                                }}
                            >
                                <h4 className={`font-serif text-2xl md:text-3xl ${isActive ? 'text-primary' : 'text-stone-500'}`}>{point.title}</h4>
                                <p className="text-xs md:text-sm text-secondary font-mono mb-1">{point.date}</p>

                                {isActive && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={(e) => { e.stopPropagation(); setJournalOpen(true); }}
                                        className="mt-2 text-[10px] md:text-xs uppercase tracking-[0.2em] text-red-400 font-bold hover:text-red-500 transition-colors flex items-center gap-2"
                                    >
                                        View Moments →
                                    </motion.button>
                                )}
                            </motion.div>
                        )
                    })}
                </motion.div>

                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
            </div>

            {/* Desktop Description Panel (Right) */}
            <AnimatePresence>
                {!journalOpen && currentCp && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 w-80 glass-panel p-8 z-20 hidden lg:block"
                    >
                        <h3 className="text-display text-4xl mb-4 text-primary">{currentCp.title}</h3>
                        <p className="font-serif italic text-lg text-secondary mb-6 leading-relaxed">
                            "{currentCp.description}"
                        </p>
                        <div className="w-12 h-0.5 bg-stone-200" />
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
                        className="absolute inset-0 z-50 flex items-center justify-center p-3 md:p-10"
                    >
                        <div className="absolute inset-0 bg-stone-50/80 backdrop-blur-2xl" onClick={() => setJournalOpen(false)} />

                        <div className="relative w-full h-full max-w-7xl glass-panel shadow-2xl overflow-y-auto p-6 md:p-12 custom-scrollbar">
                            <button
                                onClick={() => setJournalOpen(false)}
                                className="fixed top-6 right-6 p-4 bg-white/80 backdrop-blur shadow-lg rounded-full hover:bg-white transition-all z-[70] active:scale-90"
                            >
                                <FaTimes className="text-primary" />
                            </button>

                            <div className="text-center mb-10 md:mb-16">
                                <p className="text-[10px] uppercase tracking-[0.4em] font-sans text-accent mb-3">Our Time in</p>
                                <h2 className="text-4xl md:text-7xl lg:text-8xl text-display text-primary leading-tight">{currentCp.title}</h2>
                                {currentCp.description && (
                                    <p className="mt-4 text-secondary italic font-serif max-w-xl mx-auto opacity-70">
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
