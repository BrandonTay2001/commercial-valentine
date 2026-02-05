import React, { useRef, useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { FaHeart, FaTimes } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import 'mapbox-gl/dist/mapbox-gl.css';

const PhotoJournal = lazy(() => import('./PhotoJournal'));

const ITEM_HEIGHT = 150;

// Custom Location Marker with rotating image preview
const LocationMarker = React.memo(({ checkpoint, isActive, onClick, onOpenJournal, isDark, shouldLoadImages = false, previewImage }) => {
    // Initialize with previewImage if available
    const [images, setImages] = useState(previewImage ? [previewImage] : []);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Update images if previewImage changes and we have nothing else (rare case of late load)
    useEffect(() => {
        if (previewImage && images.length === 0) {
            setImages([previewImage]);
        }
    }, [previewImage]);

    // Optimized image fetching:
    // - Distant markers (shouldLoadImages=false): Fetch only 1 image for preview
    // - Nearby markers (shouldLoadImages=true): Fetch up to 5 images for rotation
    useEffect(() => {
        let isMounted = true;

        const fetchImages = async () => {
            // If we are distant and already have images, just limit to 1 (save memory)
            if (!shouldLoadImages && images.length > 0) {
                if (images.length > 1) {
                    setImages(prev => prev.slice(0, 1));
                    setCurrentImageIndex(0);
                }
                return;
            }

            // If we are nearby and already have 5, no need to fetch
            if (shouldLoadImages && images.length >= 5) return;

            const limit = shouldLoadImages ? 5 : 1;

            const { data } = await supabase
                .from('memories')
                .select('image_url')
                .eq('checkpoint_id', checkpoint.id)
                .order('order_index', { ascending: true })
                .limit(limit);

            if (isMounted && data) {
                // Optimization: Only update if we have more data or no data
                if (data.length > images.length || images.length === 0) {
                    setImages(data.map(m => m.image_url));
                }
            }
        };

        if (checkpoint.id) fetchImages();

        return () => { isMounted = false; };
    }, [checkpoint.id, shouldLoadImages]); // Re-run when proximity changes

    // Rotate images every 3 seconds (only when active)
    useEffect(() => {
        if (!isActive || images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % images.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [images.length, isActive]);

    // Handle click: if active, open journal; otherwise navigate to this marker
    const handleClick = useCallback(() => {
        if (isActive && onOpenJournal) {
            onOpenJournal();
        } else {
            onClick();
        }
    }, [isActive, onOpenJournal, onClick]);

    return (
        <motion.div
            onClick={handleClick}
            className="cursor-pointer relative"
            style={{ zIndex: isActive ? 50 : 1 }} // Ensure active marker is always on top
            animate={{
                scale: isActive ? 1 : 0.75,
                opacity: isActive ? 1 : 0.7
            }}
            whileHover={{ scale: isActive ? 1.05 : 0.85 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {/* Glassmorphic Popup Box */}
            <div
                className={`relative rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl border ${isActive
                    ? 'border-white/40 bg-white/20'
                    : isDark
                        ? 'border-white/10 bg-black/30'
                        : 'border-white/30 bg-white/40'
                    }`}
                style={{
                    width: isActive ? '150px' : '90px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1) inset'
                        : '0 10px 40px -10px rgba(0, 0, 0, 0.15)'
                }}
            >
                {/* Image Preview */}
                <div className="relative aspect-[4/3] overflow-hidden">
                    <AnimatePresence mode="wait">
                        {images.length > 0 ? (
                            <motion.img
                                key={currentImageIndex}
                                src={images[currentImageIndex] || images[0]}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover"
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.6 }}
                            />
                        ) : (
                            <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-stone-800 to-stone-900' : 'bg-gradient-to-br from-stone-100 to-stone-200'
                                }`}>
                                <FaHeart className={`text-xl ${isActive ? 'text-red-400' : isDark ? 'text-stone-600' : 'text-stone-300'}`} />
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Image indicator dots */}
                    {images.length > 1 && isActive && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {images.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${i === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50'
                                    }`} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Label */}
                <div className={`px-3 py-2 text-center backdrop-blur-md border-t ${isDark ? 'bg-black/60 border-white/5' : 'bg-white/80 border-white/40'
                    }`}>
                    <span className={`font-serif italic text-xs tracking-wide truncate block ${isActive
                        ? isDark ? 'text-red-200' : 'text-red-900'
                        : isDark ? 'text-stone-300' : 'text-stone-600'
                        }`}>
                        {checkpoint.marker_label || checkpoint.title}
                    </span>
                </div>
            </div>

            {/* Glassmorphic Pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 z-10">
                <div className={`w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent drop-shadow-lg ${isActive ? 'border-t-white/60' : (isDark ? 'border-t-black/40' : 'border-t-white/70')
                    }`} />
            </div>

            {/* Glow effect for active */}
            {isActive && (
                <div className="absolute -inset-3 bg-red-400/20 rounded-3xl blur-xl -z-10" />
            )}
        </motion.div>
    );
});

const StoryMap = ({ mapStylePreset, globalZoom = 13, globalPitch = 0, coupleId = null }) => {
    const mapRef = useRef(null);
    const [checkpoints, setCheckpoints] = useState([]);
    const [previewImages, setPreviewImages] = useState({}); // Map of checkpoint_id -> image_url
    const [activeCheckpoint, setActiveCheckpoint] = useState(0);
    const [loading, setLoading] = useState(true);
    const [journalOpen, setJournalOpen] = useState(false);
    // Uncontrolled map -- only store initial state or update via ref
    const [initialViewState, setInitialViewState] = useState({
        latitude: 0,
        longitude: 0,
        zoom: globalZoom,
        pitch: globalPitch
    });

    useEffect(() => {
        fetchCheckpoints();
    }, [globalZoom, globalPitch, coupleId]);

    const fetchCheckpoints = async () => {
        let query = supabase
            .from('checkpoints')
            .select('*')
            .order('order_index', { ascending: true });

        // Filter by couple_id if provided (for multi-user support)
        if (coupleId) {
            query = query.eq('couple_id', coupleId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
            setCheckpoints(data);
            setInitialViewState({ // Set initial view ONLY once ideally, or when data loads
                latitude: data[0].latitude,
                longitude: data[0].longitude,
                zoom: globalZoom || data[0].zoom || 13,
                pitch: globalPitch
            });

            // Batch fetch first images for all checkpoints
            // We fetch all memories with limit logic or just all and filter in JS (easier for now if dataset < 1000)
            // Optimization: Fetch only necessary fields
            let memoriesQuery = supabase
                .from('memories')
                .select('checkpoint_id, image_url, order_index')
                .order('order_index', { ascending: true });

            // Also filter memories by couple_id if provided
            if (coupleId) {
                memoriesQuery = memoriesQuery.eq('couple_id', coupleId);
            }

            const { data: memories } = await memoriesQuery;

            if (memories) {
                const previews = {};
                // Since they are ordered, the first one we encounter for each checkpoint is the first one
                memories.forEach(m => {
                    if (!previews[m.checkpoint_id]) {
                        previews[m.checkpoint_id] = m.image_url;
                    }
                });
                setPreviewImages(previews);
            }
        }
        setLoading(false);
    };

    const flyToLocation = useCallback((index) => {
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
            zoom: globalZoom || target.zoom || 13,
            pitch: globalPitch, // Apply global pitch
            speed: 0.9,
            curve: 1.5,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            essential: true
        });
    }, [checkpoints, globalZoom, globalPitch]);

    // Improved momentum scrolling for mobile
    const handleDragEnd = (_, info) => {
        const { offset, velocity } = info;
        const ROW_HEIGHT = 150;

        // Vertical boundary Hand-off Logic
        if (activeCheckpoint === 0 && offset.y > 100) {
            document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (activeCheckpoint === checkpoints.length - 1 && offset.y < -100) {
            document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // Calculate predicted travel based on velocity (inertial scroll simulation)
        // Adjust multiplier to tune "friction"
        const velocityFactor = 0.2;
        const predictedOffset = offset.y + (velocity.y * velocityFactor);

        // Calculate how many items we should shift by
        // Dragging UP (negative y) -> Next items (Increment Index)
        // Dragging DOWN (positive y) -> Previous items (Decrement Index)
        const itemsMoved = -Math.round(predictedOffset / ROW_HEIGHT);

        let targetIndex = activeCheckpoint + itemsMoved;

        // Clamp to valid range
        targetIndex = Math.max(0, Math.min(checkpoints.length - 1, targetIndex));

        // Only fly if we are actually changing location
        if (targetIndex !== activeCheckpoint) {
            flyToLocation(targetIndex);
        } else {
            // If we didn't change index, the standard spring animation will snap us back
            // But we need to ensure any internal state is consistent if needed
            // (framer motion handles the visual snap back to original y since we didn't update state)
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
                    initialViewState={initialViewState}
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
                            style={{ zIndex: activeCheckpoint === index ? 100 : 'auto' }}
                        >
                            <LocationMarker
                                checkpoint={site}
                                isActive={activeCheckpoint === index}
                                onClick={() => flyToLocation(index)}
                                onOpenJournal={() => setJournalOpen(true)}
                                isDark={isDarkStyle}
                                shouldLoadImages={Math.abs(activeCheckpoint - index) <= 1}
                                previewImage={previewImages[site.id]}
                            />
                        </Marker>
                    ))}
                </Map>
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-r ${theme.gradientFrom} ${theme.gradientVia} to-transparent md:block hidden`} />
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-b ${theme.gradientMobile} via-transparent ${theme.gradientMobile} md:hidden block`} />
            </div>

            {/* Wheel Scroller UI - Compact Mobile Design */}
            <div
                className="absolute left-0 md:left-20 bottom-32 md:top-1/2 md:-translate-y-1/2 z-20 w-full md:w-80 h-[240px] md:h-[450px] overflow-hidden select-none touch-none"
                onWheel={(e) => {
                    // Optimized wheel handler
                    if (Math.abs(e.deltaY) > 10) {
                        const now = Date.now();
                        // Reduce debounce to 100ms for more responsive feel
                        if (!window.lastScroll || now - window.lastScroll > 100) {
                            window.lastScroll = now;
                            const direction = e.deltaY > 0 ? 1 : -1;
                            if (direction > 0 && activeCheckpoint < checkpoints.length - 1) {
                                flyToLocation(activeCheckpoint + 1);
                            } else if (direction < 0 && activeCheckpoint > 0) {
                                flyToLocation(activeCheckpoint - 1);
                            }
                        }
                    }
                }}
            >


                <motion.div
                    className="absolute top-1/2 left-0 w-full z-40 cursor-grab active:cursor-grabbing touch-none"
                    style={{ marginTop: -75 }} // Center the active item (150px / 2)
                    initial={false}
                    animate={{ y: -activeCheckpoint * ITEM_HEIGHT }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                    }}
                    drag="y"
                    dragConstraints={{ top: -((checkpoints.length - 1) * ITEM_HEIGHT), bottom: 0 }}
                    dragElastic={0.2}
                    dragDirectionLock={true}
                    dragTransition={{
                        power: 0.4, // Increased from 0.1 for more momentum
                        timeConstant: 400, // Increased from 200 for smoother glide
                        modifyTarget: (target) => {
                            // Strict grid snapping
                            const snapped = Math.round(target / ITEM_HEIGHT) * ITEM_HEIGHT;
                            // Clamp within bounds
                            const max = 0;
                            const min = -((checkpoints.length - 1) * ITEM_HEIGHT);
                            return Math.max(min, Math.min(max, snapped));
                        }
                    }}
                    onDragEnd={(e, { offset, velocity }) => {
                        // Calculate the index we SHOULD be at based on the snap
                        // We duplicate the snap logic here to update React state
                        const currentY = -activeCheckpoint * ITEM_HEIGHT;
                        const predictedY = currentY + offset.y + (velocity.y * 0.1);
                        const snappedY = Math.round(predictedY / ITEM_HEIGHT) * ITEM_HEIGHT;

                        const targetIndex = Math.abs(Math.round(snappedY / ITEM_HEIGHT));

                        // Guard against NaN or bounds
                        const safeIndex = Math.max(0, Math.min(checkpoints.length - 1, targetIndex));

                        if (safeIndex !== activeCheckpoint) {
                            flyToLocation(safeIndex);
                        }
                    }}
                >
                    {checkpoints.map((point, idx) => {
                        const isActive = activeCheckpoint === idx;
                        return (
                            <motion.div
                                key={point.id}
                                className={`h-[150px] flex flex-col justify-center px-10 md:pl-8 md:pr-0 border-l-4 md:border-l-2 transition-all ${isActive ? 'border-red-400 opacity-100' : `${theme.border} opacity-20`}`}
                                animate={{
                                    scale: isActive ? 1.05 : 0.85,
                                    x: isActive ? (window.innerWidth < 768 ? 10 : 10) : 0,
                                    y: 0,
                                    opacity: isActive ? 1 : (isDarkStyle ? 0.3 : 0.4),
                                    filter: isActive ? 'blur(0px)' : 'blur(1px)' // Blur distant items for depth
                                }}
                            >
                                <h4 className={`font-serif text-3xl md:text-3xl lg:text-4xl leading-tight ${isActive ? theme.textPrimary : theme.textMuted}`}>
                                    {point.title}
                                </h4>
                                <p className={`text-xs md:text-sm ${theme.textSecondary} font-mono mb-1 tracking-widest`}>{point.date_visited}</p>

                                {isActive && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setJournalOpen(true)}
                                        className="mt-3 text-[10px] md:text-xs uppercase tracking-[0.3em] text-red-500 font-bold hover:text-red-600 transition-colors flex items-center gap-2 relative z-50 pointer-events-auto"
                                    >
                                        Explore Moments →
                                    </motion.button>
                                )}
                            </motion.div>
                        )
                    })}
                </motion.div>

                {/* Fade Masks - Adjusted for mobile compactness */}
                <div className={`absolute top-0 left-0 w-full h-20 md:h-32 bg-gradient-to-b ${isDarkStyle ? 'from-stone-900' : 'from-white'} via-transparent to-transparent pointer-events-none`} />
                <div className={`absolute bottom-0 left-0 w-full h-20 md:h-32 bg-gradient-to-t ${isDarkStyle ? 'from-stone-900' : 'from-white'} via-transparent to-transparent pointer-events-none`} />
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

                        <div className="relative w-full h-full max-w-7xl glass-panel-flat md:glass-panel shadow-2xl overflow-y-auto p-4 md:p-16 custom-scrollbar">
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

                            <Suspense fallback={<div className="p-20 text-center">Loading Journal...</div>}>
                                <PhotoJournal checkpointId={currentCp.id} isPage={true} coupleId={coupleId} />
                            </Suspense>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default StoryMap;
