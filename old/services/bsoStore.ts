
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as types from '../types';

interface BSOState {
    roles: types.BSORole[];
    submissions: types.BSOSubmission[];
}

interface BSOContextType extends BSOState {
    addRole: (role: types.BSORole) => void;
    updateRole: (id: string, updates: Partial<types.BSORole>) => void;
    addSubmission: (submission: types.BSOSubmission) => void;
    updateSubmission: (id: string, updates: Partial<types.BSOSubmission>) => void;
    getRolesByEntity: (entityId: string) => types.BSORole[];
    getSubmissionsByRole: (roleId: string) => types.BSOSubmission[];
}

const STORAGE_KEY = 'fiduciary_bso_state';

const BSOContext = createContext<BSOContextType | undefined>(undefined);

export const useBSOStore = () => {
    const context = useContext(BSOContext);
    if (!context) throw new Error('useBSOStore must be used within a BSOProvider');
    return context;
};

export const BSOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<BSOState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse BSO state', e);
            }
        }
        return { roles: [], submissions: [] };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    // Polling simulation for AccuWage (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            const pendingSubmissions = state.submissions.filter(s =>
                s.status === 'Pending' || s.status === 'Transmitting'
            );

            if (pendingSubmissions.length > 0) {
                pendingSubmissions.forEach(sub => {
                    // 90% success rate for simulation
                    const isSuccess = Math.random() > 0.1;
                    const updates: Partial<types.BSOSubmission> = isSuccess
                        ? { status: 'Completed', acknowledgedAt: new Date().toISOString(), accuWageStatus: 'Pass' }
                        : {
                            status: 'Error',
                            accuWageStatus: 'Errors',
                            errorDetails: [
                                {
                                    code: 'W2-VALIDATION-001',
                                    message: 'AccuWage detected missing secondary address field in BW record.',
                                    resolution: 'Update employer address to include suite or floor number.',
                                    category: 'Validation'
                                }
                            ]
                        };

                    updateSubmission(sub.id, updates);
                });
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [state.submissions]);

    const addRole = (role: types.BSORole) => {
        setState(prev => ({ ...prev, roles: [...prev.roles, role] }));
    };

    const updateRole = (id: string, updates: Partial<types.BSORole>) => {
        setState(prev => ({
            ...prev,
            roles: prev.roles.map(r => r.id === id ? { ...r, ...updates } : r)
        }));
    };

    const addSubmission = (submission: types.BSOSubmission) => {
        setState(prev => ({ ...prev, submissions: [...prev.submissions, submission] }));
    };

    const updateSubmission = (id: string, updates: Partial<types.BSOSubmission>) => {
        setState(prev => ({
            ...prev,
            submissions: prev.submissions.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const getRolesByEntity = (entityId: string) => {
        return state.roles.filter(r => r.entityId === entityId);
    };

    const getSubmissionsByRole = (roleId: string) => {
        return state.submissions.filter(s => s.bsoRoleId === roleId);
    };

    return React.createElement(BSOContext.Provider, {
        value: {
            ...state,
            addRole,
            updateRole,
            addSubmission,
            updateSubmission,
            getRolesByEntity,
            getSubmissionsByRole
        }
    }, children);
};
