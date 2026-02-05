import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BsArrowLeft, BsShieldLock } from 'react-icons/bs';
import { supabase } from '../lib/supabase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is already logged in
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // User is logged in, redirect based on whether they have a couple
                const { data: couple } = await supabase
                    .from('couples')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (couple) {
                    navigate('/admin', { replace: true });
                } else {
                    navigate('/onboarding', { replace: true });
                }
            }
        };

        checkAuth();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                throw signInError;
            }

            if (data.user) {
                // Check if user has a couple
                const { data: couple, error: coupleError } = await supabase
                    .from('couples')
                    .select('*')
                    .eq('user_id', data.user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (coupleError && coupleError.code !== 'PGRST116') {
                    throw coupleError;
                }

                if (couple) {
                    navigate('/admin');
                } else {
                    navigate('/onboarding');
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
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
                    <h1 className="text-3xl font-serif italic text-primary">Welcome Back</h1>
                    <p className="text-sm text-secondary mt-2">Sign in to manage your love story.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-white/40 border border-white/60 rounded-xl px-5 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            className="w-full bg-white/40 border border-white/60 rounded-xl px-5 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all"
                            required
                        />
                    </div>

                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </motion.button>
                </form>

                <p className="text-xs text-center text-secondary mt-6">
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/onboarding')}
                        className="text-primary font-medium hover:underline"
                    >
                        Get Started
                    </button>
                </p>

                <p className="text-[10px] text-center text-accent/60 mt-8 uppercase tracking-[0.2em]">
                    Secure Access • Your Story, Your Control
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
