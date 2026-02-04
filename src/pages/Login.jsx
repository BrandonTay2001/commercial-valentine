import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft, BsShieldLock } from 'react-icons/bs';

const Login = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Simple mock authentication
        if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
            sessionStorage.setItem('isAuthenticated', 'true');
            navigate('/admin');
        } else {
            setError('Incorrect secret key. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-30 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel w-full max-w-md p-10 relative z-10"
            >
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 left-6 text-accent hover:text-primary transition-colors flex items-center gap-2 text-sm"
                >
                    <BsArrowLeft /> Back
                </button>

                <div className="flex flex-col items-center mb-8 pt-4">
                    <div className="p-4 bg-white/50 rounded-full mb-4 shadow-sm border border-white/60">
                        <BsShieldLock className="text-3xl text-primary" />
                    </div>
                    <h1 className="text-3xl font-serif italic text-primary">Entrance</h1>
                    <p className="text-sm text-secondary mt-2">Enter the secret key to access settings.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Secret Key"
                            className="w-full bg-white/40 border border-white/60 rounded-xl px-5 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all text-center tracking-widest"
                        />
                        {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-3 bg-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                    >
                        Authenticate
                    </motion.button>
                </form>

                <p className="text-[10px] text-center text-accent/60 mt-8 uppercase tracking-[0.2em]">
                    Restricted Access • Authorized Only
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
