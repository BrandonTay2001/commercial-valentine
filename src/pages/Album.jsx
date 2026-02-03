import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PhotoJournal from '../components/PhotoJournal';
import { BsArrowLeft } from 'react-icons/bs';

const Album = () => {
    return (
        <div className="min-h-dvh bg-stone-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Top Navigation Bar */}
            <div
                className="fixed left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-white/80 to-transparent pointer-events-none"
                style={{ top: 'env(safe-area-inset-top, 0px)' }}
            >
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
            <div className="pt-20 md:pt-24 px-3 md:px-6">
                <PhotoJournal isPage={true} />
            </div>

        </div>
    );
};

export default Album;
