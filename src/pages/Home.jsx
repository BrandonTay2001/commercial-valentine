import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import StoryMap from '../components/StoryMap';
import { BsImages } from 'react-icons/bs';

const Home = () => {
    return (
        <div className="snap-container relative">
            <HeroSection />

            <StoryMap />


            <footer className="snap-section min-h-[50vh] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md">
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
