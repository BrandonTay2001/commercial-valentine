import React from 'react';
import { motion } from 'framer-motion';
import { BsArrowDown } from 'react-icons/bs';

const HeroSection = () => {
    return (
        <section id="hero" className="snap-section relative z-10">
            <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center">

                {/* Main Title Group */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="glass-panel p-12 md:p-20 relative overflow-hidden"
                    style={{ maxWidth: '600px' }}
                >
                    {/* Decorative Glow */}
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-white opacity-20 blur-[80px] pointer-events-none" />

                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="text-sm md:text-base uppercase tracking-[0.3em] mb-4 font-sans text-accent"
                    >
                        The Journey of Us
                    </motion.h2>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="text-6xl md:text-8xl mb-2 text-display text-primary"
                    >
                        Our Story
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        transition={{ delay: 1.2, duration: 1 }}
                        className="font-serif italic text-xl md:text-2xl mt-4"
                    >
                        "Every love story is beautiful, but ours is my favorite."
                    </motion.p>
                </motion.div>

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
                        onClick={() => document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' })}
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
