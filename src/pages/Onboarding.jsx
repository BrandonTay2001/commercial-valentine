import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BsArrowLeft, BsShieldLock, BsHeart, BsCheckCircle, BsXCircle } from 'react-icons/bs';
import { supabase } from '../lib/supabase';

const STEP_AUTH = 1;
const STEP_COUPLE_INFO = 2;

const Onboarding = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(STEP_AUTH);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stripeValidated, setStripeValidated] = useState(false);
    const [stripeEmail, setStripeEmail] = useState('');

    // Auth form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Couple info form state
    const [coupleName, setCoupleName] = useState('');
    const [path, setPath] = useState('');
    const [checkingPath, setCheckingPath] = useState(false);
    const [pathAvailable, setPathAvailable] = useState(null);
    const [pathError, setPathError] = useState('');

    useEffect(() => {
        // Check if user is already authenticated
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // User is already logged in, check if they have a couple
                const { data: couple } = await supabase
                    .from('couples')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (couple) {
                    // Already has a couple, redirect to admin
                    navigate('/admin', { replace: true });
                } else {
                    // Logged in but no couple, skip to step 2
                    setStep(STEP_COUPLE_INFO);
                }
            }
        };

        // Validate Stripe session if provided
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
            validateStripeSession(sessionId);
        } else {
            // No session ID - allow proceeding (for demo/testing)
            setStripeValidated(true);
        }

        checkAuth();
    }, [searchParams, navigate]);

    const validateStripeSession = async (sessionId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('validate-stripe-session', {
                body: { sessionId },
            });

            if (error || !data?.valid) {
                throw new Error(data?.error || 'Invalid session. Please complete checkout first.');
            }

            setStripeValidated(true);
            setStripeEmail(data.customerEmail || '');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            // Pre-fill email from Stripe if available
            const emailToUse = email || stripeEmail;

            if (!emailToUse) {
                throw new Error('Email is required');
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: emailToUse,
                password,
            });

            if (signUpError) {
                throw signUpError;
            }

            if (data.user) {
                // Move to next step
                setStep(STEP_COUPLE_INFO);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const checkPathAvailability = async (value) => {
        setPathError('');

        // Validate path format
        const pathRegex = /^[a-z0-9-]+$/;
        if (!pathRegex.test(value)) {
            setPathError('Path can only contain lowercase letters, numbers, and hyphens');
            setPathAvailable(null);
            return;
        }

        if (value.length < 3) {
            setPathError('Path must be at least 3 characters');
            setPathAvailable(null);
            return;
        }

        if (value.length > 30) {
            setPathError('Path must be less than 30 characters');
            setPathAvailable(null);
            return;
        }

        setCheckingPath(true);

        try {
            const { data, error } = await supabase
                .from('couples')
                .select('path')
                .eq('path', value)
                .maybeSingle();

            if (error) throw error;

            setPathAvailable(!data);
        } catch (err) {
            console.error('Error checking path:', err);
            setPathAvailable(null);
        } finally {
            setCheckingPath(false);
        }
    };

    // Debounced path check
    useEffect(() => {
        if (path && path.length >= 3) {
            const timer = setTimeout(() => {
                checkPathAvailability(path);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setPathAvailable(null);
        }
    }, [path]);

    const handleCreateCouple = async (e) => {
        e.preventDefault();
        setError('');

        if (!coupleName.trim()) {
            setError('Please enter a couple name');
            return;
        }

        if (!path.trim()) {
            setError('Please choose a path for your site');
            return;
        }

        if (pathAvailable === false) {
            setError('This path is already taken. Please choose another.');
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('You must be logged in to create a couple');
            }

            const { data, error } = await supabase
                .from('couples')
                .insert({
                    user_id: user.id,
                    couple_name: coupleName.trim(),
                    path: path.trim().toLowerCase(),
                })
                .select()
                .single();

            if (error) throw error;

            // Redirect to admin dashboard
            navigate('/admin', { replace: true });
        } catch (err) {
            setError(err.message);
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
                        {step === STEP_AUTH ? (
                            <BsShieldLock className="text-3xl text-primary" />
                        ) : (
                            <BsHeart className="text-3xl text-primary" />
                        )}
                    </div>
                    <h1 className="text-3xl font-serif italic text-primary">
                        {step === STEP_AUTH ? 'Create Account' : 'Your Love Story'}
                    </h1>
                    <p className="text-sm text-secondary mt-2">
                        {step === STEP_AUTH
                            ? 'Start your journey together.'
                            : 'Choose your unique site name.'}
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center gap-2 mb-8">
                    {[STEP_AUTH, STEP_COUPLE_INFO].map((s) => (
                        <motion.div
                            key={s}
                            className={`h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-stone-200'}`}
                            initial={{ width: 0 }}
                            animate={{ width: s <= step ? '40px' : '20px' }}
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === STEP_AUTH && (
                        <motion.form
                            key="auth"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleSignUp}
                            className="space-y-4"
                        >
                            {loading && !stripeValidated ? (
                                <div className="py-8 text-center">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-secondary">Validating your subscription...</p>
                                </div>
                            ) : (
                                <>
                                    {stripeEmail && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                                            Using email from your subscription: {stripeEmail}
                                        </div>
                                    )}

                                    {!stripeEmail && (
                                        <div>
                                            <label className="block text-xs font-medium text-secondary mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 6 characters"
                                            className="w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-secondary mb-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm your password"
                                            className="w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all"
                                            required
                                            minLength={6}
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
                                        {loading ? 'Creating Account...' : 'Continue'}
                                    </motion.button>

                                    <p className="text-xs text-center text-secondary">
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login')}
                                            className="text-primary font-medium hover:underline"
                                        >
                                            Sign In
                                        </button>
                                    </p>
                                </>
                            )}
                        </motion.form>
                    )}

                    {step === STEP_COUPLE_INFO && (
                        <motion.form
                            key="couple"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleCreateCouple}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-medium text-secondary mb-1">Couple Name</label>
                                <input
                                    type="text"
                                    value={coupleName}
                                    onChange={(e) => setCoupleName(e.target.value)}
                                    placeholder="e.g., Sarah & James"
                                    className="w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3 outline-none focus:bg-white/60 focus:border-red-200 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-secondary mb-1">Your Site Path</label>
                                <div className="relative flex items-center bg-white/40 border border-white/60 rounded-xl focus-within:bg-white/60 focus-within:border-red-200 transition-all">
                                    <span className="pl-4 text-stone-400 text-sm whitespace-nowrap flex-shrink-0">
                                        {window.location.host}/
                                    </span>
                                    <input
                                        type="text"
                                        value={path}
                                        onChange={(e) => setPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="sarah-james"
                                        className="flex-1 bg-transparent pr-10 py-3 outline-none min-w-0"
                                        required
                                    />
                                    {checkingPath ? (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-stone-300 border-t-primary rounded-full animate-spin" />
                                        </div>
                                    ) : pathAvailable === true ? (
                                        <BsCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                                    ) : pathAvailable === false ? (
                                        <BsXCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" />
                                    ) : null}
                                </div>
                                {pathError && <p className="text-xs text-red-400 mt-1">{pathError}</p>}
                                <p className="text-xs text-stone-400 mt-1">
                                    This will be your unique URL. Lowercase letters, numbers, and hyphens only.
                                </p>
                            </div>

                            {error && <p className="text-xs text-red-400">{error}</p>}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading || pathAvailable === false}
                                className="w-full py-3 bg-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? 'Creating Your Site...' : 'Create Your Site'}
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <p className="text-[10px] text-center text-accent/60 mt-8 uppercase tracking-[0.2em]">
                    Secure & Private • Your Story, Your Way
                </p>
            </motion.div>
        </div>
    );
};

export default Onboarding;
