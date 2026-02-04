import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsSearch, BsGeoAlt } from 'react-icons/bs';

const AddressSearch = ({ latitude, longitude, address, onSelect }) => {
    const [query, setQuery] = useState(address || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = React.useRef(null);

    // Sync query when address prop changes (switching checkpoints)
    useEffect(() => {
        setQuery(address || '');
    }, [address]);

    const searchAddress = async (text) => {
        if (!text || text.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;
            // Use Google Places Autocomplete API
            const response = await fetch(
                `https://places.googleapis.com/v1/places:autocomplete`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey
                    },
                    body: JSON.stringify({
                        input: text,
                        includedPrimaryTypes: ['street_address', 'subpremise', 'premise', 'establishment', 'geocode']
                    })
                }
            );
            const data = await response.json();
            if (data.suggestions) {
                setSuggestions(data.suggestions.map(s => ({
                    place_id: s.placePrediction?.placeId,
                    name: s.placePrediction?.structuredFormat?.mainText?.text || '',
                    full_address: s.placePrediction?.text?.text || s.placePrediction?.structuredFormat?.secondaryText?.text || ''
                })).filter(s => s.place_id));
            }
        } catch (err) {
            console.error('Search error:', err);
        }
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setShowDropdown(true);

        // Debounce API calls
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchAddress(val), 300);
    };

    const handleSelect = async (suggestion) => {
        setQuery(suggestion.full_address);
        setSuggestions([]);
        setShowDropdown(false);

        // Get place details to retrieve coordinates
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;
            const response = await fetch(
                `https://places.googleapis.com/v1/places/${suggestion.place_id}?fields=location`,
                {
                    headers: {
                        'X-Goog-Api-Key': apiKey
                    }
                }
            );
            const data = await response.json();
            if (data.location) {
                onSelect(data.location.latitude, data.location.longitude, suggestion.full_address);
            }
        } catch (err) {
            console.error('Place details error:', err);
        }
    };

    const hasCoords = latitude && longitude && (latitude !== 0 || longitude !== 0);

    return (
        <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-accent/60 tracking-[0.2em] ml-2">Location</label>
            <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300">
                    <BsSearch />
                </div>
                <input
                    type="text"
                    className="w-full bg-stone-50 border border-stone-100 rounded-2xl pl-12 pr-6 py-3.5 outline-none focus:bg-white focus:border-red-100 transition-all font-medium text-primary shadow-sm"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Search for an address or city..."
                />
                {loading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-stone-200 border-t-red-400 rounded-full animate-spin" />
                    </div>
                )}

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showDropdown && suggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden max-h-60 overflow-y-auto"
                        >
                            {suggestions.map(s => (
                                <button
                                    key={s.place_id}
                                    onClick={() => handleSelect(s)}
                                    className="w-full text-left px-5 py-3.5 hover:bg-stone-50 transition-colors flex items-start gap-3 border-b border-stone-50 last:border-0"
                                >
                                    <BsGeoAlt className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-primary">{s.name}</span>
                                        <span className="text-xs text-stone-400">{s.full_address}</span>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Coordinates Preview */}
            {hasCoords && (
                <div className="flex items-center gap-2 text-xs text-stone-400 ml-2 mt-2">
                    <BsGeoAlt className="text-red-300" />
                    <span>Lat: {latitude?.toFixed(4)}, Lng: {longitude?.toFixed(4)}</span>
                </div>
            )}
        </div>
    );
};

export default AddressSearch;
