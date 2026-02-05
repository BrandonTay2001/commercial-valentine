import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const CoupleContext = createContext(null);

export const useCouple = () => {
    const context = useContext(CoupleContext);
    if (!context) {
        throw new Error('useCouple must be used within a CoupleProvider');
    }
    return context;
};

export const CoupleProvider = ({ children, couplePath = null }) => {
    const [couple, setCouple] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch couple by path (for public couple sites)
    const fetchCoupleByPath = useCallback(async (path) => {
        if (!path) {
            setCouple(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from('couples')
            .select('*')
            .eq('path', path)
            .eq('is_active', true)
            .single();

        if (error) {
            setError(error);
            setCouple(null);
        } else {
            setCouple(data);
        }
        setLoading(false);
    }, []);

    // Fetch user's couple (for admin/authenticated views)
    const fetchUserCouple = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setCouple(null);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('couples')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No couple found for user
                setCouple(null);
            } else {
                setError(error);
            }
        } else {
            setCouple(data);
        }
        setLoading(false);
    }, []);

    // Create a new couple
    const createCouple = useCallback(async (coupleData) => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User must be authenticated to create a couple');
        }

        const { data, error } = await supabase
            .from('couples')
            .insert({
                user_id: user.id,
                ...coupleData,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        setCouple(data);
        return data;
    }, []);

    // Update couple settings
    const updateCouple = useCallback(async (updates) => {
        if (!couple?.id) {
            throw new Error('No couple selected');
        }

        const { data, error } = await supabase
            .from('couples')
            .update(updates)
            .eq('id', couple.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        setCouple(data);
        return data;
    }, [couple?.id]);

    // Check if a path is available
    const checkPathAvailability = useCallback(async (path) => {
        const { data, error } = await supabase
            .from('couples')
            .select('path')
            .eq('path', path)
            .maybeSingle();

        return !data; // Returns true if path is available (no data found)
    }, []);

    // Load couple data on mount
    useEffect(() => {
        if (couplePath) {
            fetchCoupleByPath(couplePath);
        } else {
            // For authenticated pages, we'll load user's couple separately
            setLoading(false);
        }
    }, [couplePath, fetchCoupleByPath]);

    const value = {
        couple,
        coupleId: couple?.id,
        loading,
        error,
        fetchCoupleByPath,
        fetchUserCouple,
        createCouple,
        updateCouple,
        checkPathAvailability,
    };

    return (
        <CoupleContext.Provider value={value}>
            {children}
        </CoupleContext.Provider>
    );
};

export default CoupleContext;
