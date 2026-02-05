import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BsArrowLeft } from 'react-icons/bs';
import HeroSection from '../components/HeroSection';
import StoryMap from '../components/StoryMap';
import { CoupleProvider, useCouple } from '../contexts/CoupleContext';
import { supabase } from '../lib/supabase';

const CoupleSiteContent = () => {
    const { path } = useParams();
    const navigate = useNavigate();
    const { couple, loading, error } = useCouple();
    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-45% 0px -45% 0px',
            threshold: 0
        };

        const sections = ['hero', 'map', 'footer'];
        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-stone-50">
                <div className="text-display italic text-2xl animate-pulse text-stone-300">Loading your story...</div>
            </div>
        );
    }

    if (error || !couple) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel w-full max-w-md p-10 text-center"
                >
                    <div className="p-4 bg-white/50 rounded-full mb-4 shadow-sm border border-white/60 inline-block">
                        <BsArrowLeft className="text-3xl text-primary" />
                    </div>
                    <h1 className="text-3xl font-serif italic text-primary mb-4">Site Not Found</h1>
                    <p className="text-sm text-secondary mb-8">
                        This love story doesn't exist yet. Check the URL or return home.
                    </p>
                    <Link
                        to="/"
                        className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                    >
                        Return Home
                    </Link>
                </motion.div>
            </div>
        );
    }

    const isDarkMap = couple?.map_style?.includes('dark') || couple?.map_style?.includes('satellite');

    // Section Navigation Component
    const SectionNav = () => {
        const sections = [
            { id: 'hero', label: 'Home' },
            { id: 'map', label: 'Story' },
            { id: 'footer', label: 'Finish' }
        ];

        const scrollTo = (id) => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        };

        const useLightDots = (activeSection === 'map' && isDarkMap);

        return (
            <div className="fixed right-6 md:right-8 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-8 items-center">
                {sections.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                        <motion.button
                            key={section.id}
                            onClick={() => scrollTo(section.id)}
                            className="group relative flex items-center justify-center w-6 h-6"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <motion.span
                                initial={{ opacity: 0, x: 20 }}
                                whileHover={{ opacity: 1, x: -10 }}
                                className={`absolute right-full mr-4 text-[10px] uppercase tracking-[0.4em] font-sans pointer-events-none whitespace-nowrap hidden md:block ${useLightDots ? 'text-white/60' : 'text-stone-400'}`}
                            >
                                {section.label}
                            </motion.span>

                            <div
                                className={`rounded-full transition-all duration-700 ${isActive
                                    ? 'bg-red-400 w-3 h-3 shadow-lg shadow-red-200'
                                    : `${useLightDots ? 'bg-white/40 group-hover:bg-white/60' : 'bg-stone-300 group-hover:bg-stone-400'} w-2 h-2`
                                    }`}
                            />

                            {isActive && (
                                <motion.div
                                    layoutId="nav-ring"
                                    className={`absolute inset-[-6px] border rounded-full ${useLightDots ? 'border-white/20' : 'border-red-100'}`}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="snap-container relative">
            <SectionNav />

            <div id="hero" className="snap-section relative overflow-hidden flex flex-col items-center justify-center">
                {/* Custom Blurred Background */}
                <div
                    className="absolute inset-0 z-0 scale-110"
                    style={{
                        backgroundImage: `url(${couple?.hero_bg_url || '/default-couple-bg.png'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: `blur(${couple?.hero_blur_amount || 16}px) brightness(0.9)`,
                        opacity: 0.8
                    }}
                />
                <HeroSection settings={couple} />
            </div>

            <div id="map" className="snap-section">
                <StoryMap
                    coupleId={couple.id}
                    mapStylePreset={couple?.map_style}
                    globalZoom={couple?.map_zoom_level}
                    globalPitch={couple?.map_pitch}
                />
            </div>

            <footer id="footer" className="snap-section relative overflow-hidden min-h-screen flex flex-col items-center justify-center">
                {/* Mirrored Blurred Background */}
                <div
                    className="absolute inset-0 z-0 scale-110"
                    style={{
                        backgroundImage: `url(${couple?.hero_bg_url || '/default-couple-bg.png'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: `blur(${(couple?.hero_blur_amount || 16) * 2}px) brightness(1.1)`,
                        opacity: 0.6
                    }}
                />

                {(() => {
                    const textColor = couple?.text_color || 'white';
                    const isWhite = textColor === 'white';
                    const textClasses = {
                        title: isWhite ? 'text-white' : 'text-black',
                        description: isWhite ? 'text-white/80' : 'text-black/80',
                        caption: isWhite ? 'text-white/60' : 'text-black/60',
                        divider: isWhite ? 'bg-white/20' : 'bg-black/20',
                        link: isWhite ? 'border-white/20 text-white/60 hover:text-white hover:border-white' : 'border-black/20 text-black/60 hover:text-black hover:border-black'
                    };

                    return (
                        <div className="max-w-md text-center px-6 relative z-10 p-12 py-16">
                            {/* Glass Background Layer */}
                            <div className={`absolute inset-0 rounded-[2.5rem] backdrop-blur-xl border ${isWhite ? 'bg-black/10 border-white/10' : 'bg-white/30 border-black/10'}`} />

                            {/* Content Layer */}
                            <div className="relative z-10">
                                <h2 className={`text-4xl font-serif italic mb-6 ${textClasses.title}`}>
                                    {couple?.footer_title || 'To Forever & Beyond'}
                                </h2>
                                <p className={`text-sm font-sans mb-12 leading-relaxed tracking-wide ${textClasses.description}`}>
                                    {couple?.footer_description || 'Built with love and shared memories. May our story continue to unfold in the most beautiful ways.'}
                                </p>

                                <div className="flex flex-col items-center gap-6">
                                    <div className={`w-12 h-px ${textClasses.divider}`} />
                                    <p className={`text-[10px] uppercase tracking-[0.4em] ${textClasses.caption}`}>
                                        {couple?.footer_caption || '2026 Valentines'}
                                    </p>

                                    <Link to="/login" className={`px-6 py-2 border rounded-full text-[10px] transition-all uppercase tracking-[0.3em] ${textClasses.link}`}>
                                        Studio Access
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </footer>
        </div>
    );
};

// Wrapper component that provides the CoupleContext with the path
const CoupleSite = () => {
    const { path } = useParams();

    return (
        <CoupleProvider couplePath={path}>
            <CoupleSiteContent />
        </CoupleProvider>
    );
};

export default CoupleSite;
