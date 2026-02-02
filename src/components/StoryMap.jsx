import React, { useRef, useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHeart, FaTimes } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import PhotoJournal from './PhotoJournal';
import 'mapbox-gl/dist/mapbox-gl.css';

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
        setJournalOpen(false); // Close journal if switching locations

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

                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[rgba(255,255,255,0.7)] via-white/10 to-transparent" />
            </div>

            {/* Wheel Scroller UI */}
            <div className="absolute left-8 md:left-20 top-1/2 -translate-y-1/2 z-20 w-80 h-[400px] overflow-hidden">
                <div className="absolute top-1/2 left-0 w-full h-px bg-red-300 opacity-30 z-0"></div>

                <motion.div
                    className="absolute top-1/2 left-0 w-full"
                    animate={{ y: -activeCheckpoint * 120 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {checkpoints.map((point, idx) => {
                        const isActive = activeCheckpoint === idx;
                        return (
                            <motion.div
                                key={point.id}
                                className={`h-[120px] flex flex-col justify-center pl-8 border-l-2 transition-all cursor-pointer ${isActive ? 'border-red-400 opacity-100' : 'border-gray-200 opacity-30 hover:opacity-60'}`}
                                onClick={() => flyToLocation(idx)}
                                animate={{ scale: isActive ? 1.05 : 0.95, x: isActive ? 10 : 0 }}
                            >
                                <h4 className={`font-serif text-2xl ${isActive ? 'text-primary' : 'text-gray-500'}`}>{point.title}</h4>
                                <p className="text-sm text-secondary font-mono mb-1">{point.date}</p>

                                {isActive && (
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={(e) => { e.stopPropagation(); setJournalOpen(true); }}
                                        className="mt-2 text-xs uppercase tracking-widest text-red-400 font-bold hover:text-red-500 transition-colors flex items-center gap-2"
                                    >
                                        View Moments →
                                    </motion.button>
                                )}
                            </motion.div>
                        )
                    })}
                </motion.div>

                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>

            {/* Floating Description Panel (Right) */}
            <AnimatePresence>
                {!journalOpen && currentCp && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 w-80 glass-panel p-8 z-20"
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-10"
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-3xl" onClick={() => setJournalOpen(false)} />

                        {/* Content Capsule */}
                        <div className="relative w-full h-full max-w-7xl glass-panel shadow-2xl overflow-y-auto overflow-x-hidden p-10 custom-scrollbar">
                            <button
                                onClick={() => setJournalOpen(false)}
                                className="absolute top-8 right-8 p-3 bg-white/50 rounded-full hover:bg-white transition-colors z-[60]"
                            >
                                <FaTimes />
                            </button>

                            <div className="text-center mb-16">
                                <p className="text-xs uppercase tracking-[0.3em] font-sans text-accent mb-2">Moments in</p>
                                <h2 className="text-6xl md:text-8xl text-display text-primary">{currentCp.title}</h2>
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
