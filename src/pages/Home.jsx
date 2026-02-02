import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import StoryMap from '../components/StoryMap';
import { supabase } from '../lib/supabase';

const SectionNav = ({ isDarkMap, activeSection }) => {
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

    // Determine dot colors based on current section and map theme
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
                        <AnimatePresence>
                            <motion.span
                                initial={{ opacity: 0, x: 20 }}
                                whileHover={{ opacity: 1, x: -10 }}
                                className={`absolute right-full mr-4 text-[10px] uppercase tracking-[0.4em] font-sans pointer-events-none whitespace-nowrap hidden md:block ${useLightDots ? 'text-white/60' : 'text-stone-400'}`}
                            >
                                {section.label}
                            </motion.span>
                        </AnimatePresence>

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

const Home = () => {
    const [settings, setSettings] = useState(null);
    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('*')
                .single();
            if (data) setSettings(data);
        };
        fetchSettings();

        // Subscribe to changes
        const subscription = supabase
            .channel('site_settings_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, (payload) => {
                setSettings(payload.new);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

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

    const isDarkMap = settings?.map_style?.includes('dark') || settings?.map_style?.includes('satellite');

    return (
        <div className="snap-container relative">
            <SectionNav activeSection={activeSection} isDarkMap={isDarkMap} />

            <div id="hero" className="snap-section relative overflow-hidden flex flex-col items-center justify-center">
                {/* Custom Blurred Background */}
                {settings?.hero_bg_url && (
                    <div
                        className="absolute inset-0 z-0 scale-110"
                        style={{
                            backgroundImage: `url(${settings.hero_bg_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(20px) brightness(0.9)',
                            opacity: 0.8
                        }}
                    />
                )}
                <HeroSection settings={settings} />
            </div>

            <div id="map" className="snap-section">
                <StoryMap mapStylePreset={settings?.map_style} />
            </div>

            <footer id="footer" className="snap-section relative overflow-hidden min-h-screen flex flex-col items-center justify-center">
                {/* Mirrored Blurred Background */}
                {settings?.hero_bg_url && (
                    <div
                        className="absolute inset-0 z-0 scale-110"
                        style={{
                            backgroundImage: `url(${settings.hero_bg_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(40px) brightness(1.1)',
                            opacity: 0.6
                        }}
                    />
                )}

                <div className={`max-w-md text-center px-6 relative z-10 glass-panel p-12 py-16 backdrop-blur-xl border ${isDarkMap ? 'bg-black/10 border-white/10' : 'bg-white/10 border-stone-100'}`}>
                    <h2 className={`text-4xl font-serif italic mb-6 ${isDarkMap ? 'text-white' : 'text-primary'}`}>To Forever & Beyond</h2>
                    <p className={`text-sm font-sans mb-12 leading-relaxed tracking-wide ${isDarkMap ? 'text-stone-300' : 'text-stone-400'}`}>
                        Built with love and shared memories. May our story continue to unfold in the most beautiful ways.
                    </p>

                    <div className="flex flex-col items-center gap-6">
                        <div className={`w-12 h-px ${isDarkMap ? 'bg-white/10' : 'bg-stone-200'}`} />
                        <p className={`text-[10px] uppercase tracking-[0.4em] ${isDarkMap ? 'text-stone-400' : 'text-stone-400'}`}>2026 Valentines</p>

                        <Link to="/login" className={`px-6 py-2 border rounded-full text-[10px] transition-all uppercase tracking-[0.3em] ${isDarkMap ? 'border-white/20 text-stone-300 hover:text-white hover:border-white' : 'border-stone-100 text-stone-300 hover:text-primary hover:border-primary'}`}>
                            Studio Access
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
