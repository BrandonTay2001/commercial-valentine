import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import StoryMap from '../components/StoryMap';

const SectionNav = () => {
    const [activeSection, setActiveSection] = useState('hero');
    const sections = [
        { id: 'hero', label: 'Home' },
        { id: 'map', label: 'Story' },
        { id: 'footer', label: 'Finish' }
    ];

    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + window.innerHeight / 2;
            sections.forEach(section => {
                const element = document.getElementById(section.id);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
                        setActiveSection(section.id);
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-6 items-center">
            {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                    <motion.button
                        key={section.id}
                        onClick={() => scrollTo(section.id)}
                        className="group relative flex items-center justify-center w-8 h-8"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        {/* Hidden Label */}
                        <AnimatePresence>
                            <motion.span
                                initial={{ opacity: 0, x: 20 }}
                                whileHover={{ opacity: 1, x: -10 }}
                                className="absolute right-full mr-4 text-[10px] uppercase tracking-[0.3em] font-sans text-stone-400 pointer-events-none whitespace-nowrap"
                            >
                                {section.label}
                            </motion.span>
                        </AnimatePresence>

                        {/* The "Droplet" / Ball */}
                        <div
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-sm ${isActive
                                    ? 'bg-red-400 scale-125 shadow-red-200/50 shadow-lg'
                                    : 'bg-stone-300 group-hover:bg-stone-400'
                                }`}
                        />

                        {/* Outer Ring for Active */}
                        {isActive && (
                            <motion.div
                                layoutId="nav-ring"
                                className="absolute inset-0 border border-red-200 rounded-full"
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
    return (
        <div className="snap-container relative">
            <SectionNav />

            <HeroSection />

            <StoryMap />

            <footer id="footer" className="snap-section min-h-[50vh] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md">
                <h2 className="text-3xl font-serif italic mb-4">To Forever & Beyond</h2>
                <p className="text-sm font-sans text-gray-500 mb-8">Built with Love • 2026</p>
                <Link to="/login" className="text-[10px] text-accent/30 hover:text-primary transition-colors uppercase tracking-[0.3em]">
                    Admin Access
                </Link>
            </footer>
        </div>
    );
};

export default Home;
