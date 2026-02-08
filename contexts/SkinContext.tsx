/**
 * SkinContext - React context for skin management
 * Manages the active skin (Current, Mobile, QuickBooks, Advanced Graph)
 * Integrates with user profile and local storage
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SkinType, SKINS, Skin } from '../types/skin';
import { useLedgerStore } from '../services/ledgerService';

interface SkinContextValue {
    activeSkin: SkinType;
    skinDetails: Skin;
    setSkin: (skin: SkinType) => void;
    availableSkins: Skin[];
}

const SkinContext = createContext<SkinContextValue | undefined>(undefined);

export const SkinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, updateUser } = useLedgerStore();
    const [activeSkin, setActiveSkinState] = useState<SkinType>('current');

    // Load skin from user profile or local storage
    useEffect(() => {
        if (currentUser?.skin) {
            setActiveSkinState(currentUser.skin);
        } else {
            const stored = localStorage.getItem('skin-preference') as SkinType;
            if (stored && SKINS[stored]) {
                setActiveSkinState(stored);
            }
        }
    }, [currentUser]);

    const setSkin = useCallback((skin: SkinType) => {
        setActiveSkinState(skin);
        localStorage.setItem('skin-preference', skin);

        // Persist to user profile if logged in
        if (currentUser?.id) {
            updateUser({ ...currentUser, skin });
        }
    }, [currentUser, updateUser]);

    const value = {
        activeSkin,
        skinDetails: SKINS[activeSkin],
        setSkin,
        availableSkins: Object.values(SKINS)
    };

    return (
        <SkinContext.Provider value={value}>
            {children}
        </SkinContext.Provider>
    );
};

export const useSkin = () => {
    const context = useContext(SkinContext);
    if (!context) throw new Error('useSkin must be used within a SkinProvider');
    return context;
};
