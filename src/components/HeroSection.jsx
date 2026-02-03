import React from 'react';
import { motion } from 'framer-motion';
import { BsArrowDown } from 'react-icons/bs';

const HeroSection = ({ settings }) => {
    // Default values if settings not loaded yet
    const label = settings?.hero_label || "The Journey of Us";
    const title = settings?.hero_title || "Our Story";
    const subtext = settings?.hero_subtext || '"Every love story is beautiful, but ours is my favorite."';

    return (
        <section className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center">

                {/* Main Title Group */}
                {/* Main Title Group */}
                <div
                    className="relative p-12 md:p-20"
                    style={{ maxWidth: '600px' }}
                >
                    {/* Glass Background Layer */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0 glass-panel z-0 overflow-hidden"
                    >
                        {/* Decorative Glow */}
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-white opacity-20 blur-[80px] pointer-events-none" />
                    </motion.div>

                    {/* Content Layer */}
                    <div className="relative z-10">
                        <motion.h2
                            key={`label-${label}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="text-sm md:text-base uppercase tracking-[0.3em] mb-4 font-sans text-white/80 mix-blend-difference"
                        >
                            {label}
                        </motion.h2>

                        <motion.h1
                            key={`title-${title}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8, duration: 1 }}
                            className="text-6xl md:text-8xl mb-2 text-display text-white/90 mix-blend-difference"
                        >
                            {title}
                        </motion.h1>

                        <motion.p
                            key={`subtext-${subtext}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.7 }}
                            transition={{ delay: 1.2, duration: 1 }}
                            className="font-serif italic text-xl md:text-2xl mt-4 text-white/80 mix-blend-difference"
                        >
                            {subtext}
                        </motion.p>
                    </div>
                </div>

                {/* Floating Start Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-12"
                >
                    <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.45)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            const mapEl = document.getElementById('map');
                            if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="glass-capsule flex items-center gap-3 text-lg font-medium cursor-pointer transition-colors"
                    >
                        Begin Journey
                        <motion.span
                            animate={{ y: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <BsArrowDown />
                        </motion.span>
                    </motion.button>
                </motion.div>

            </div>
        </section>
    );
};

export default HeroSection;
