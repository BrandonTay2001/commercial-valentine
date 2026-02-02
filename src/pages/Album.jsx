import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PhotoJournal from '../components/PhotoJournal';
import { BsArrowLeft } from 'react-icons/bs';

const Album = () => {
    return (
        <div className="min-h-screen bg-stone-50">

            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-white/60 to-transparent pointer-events-none">
                <Link to="/" className="pointer-events-auto">
                    <motion.button
                        whileHover={{ x: -5 }}
                        className="glass-capsule flex items-center gap-2 text-sm font-medium hover:bg-white/50"
                    >
                        <BsArrowLeft /> Back to Story
                    </motion.button>
                </Link>

                <h1 className="font-serif italic text-xl text-primary/80">Our Memories</h1>
            </div>

            {/* Main Album Content */}
            <div className="pt-24">
                <PhotoJournal isPage={true} />
            </div>

        </div>
    );
};

export default Album;
