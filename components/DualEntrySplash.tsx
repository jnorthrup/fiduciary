/**
 * Dual-Entry Splash Screen
 * Shown after Gmail OAuth login to let users choose between UI skins
 */

import React from 'react';
import { Building2, Sparkles, ArrowRight } from 'lucide-react';

interface DualEntrySplashProps {
    userEmail: string;
    userPhoto?: string;
    onSelectSkin: (skin: 'jnorthrup' | 'lastrust') => void;
}

export const DualEntrySplash: React.FC<DualEntrySplashProps> = ({
    userEmail,
    userPhoto,
    onSelectSkin,
}) => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                {/* User greeting */}
                <div className="text-center mb-12">
                    {userPhoto && (
                        <img
                            src={userPhoto}
                            alt="Profile"
                            className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                        />
                    )}
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back
                    </h1>
                    <p className="text-slate-400">{userEmail}</p>
                </div>

                {/* Skin selection */}
                <h2 className="text-center text-lg text-slate-300 mb-8">
                    Choose your experience
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* jnorthrup skin */}
                    <button
                        type="button"
                        onClick={() => onSelectSkin('jnorthrup')}
                        className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-blue-500 hover:bg-slate-800 transition-all duration-300 text-left"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="text-blue-400" />
                        </div>
                        <Building2 className="w-12 h-12 text-blue-400 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                            Ledger
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Entity-focused dashboard with comprehensive trust management,
                            IRS API integration, and multi-entity bookkeeping.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                Multi-Entity
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                IRS Forms
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                IRM Tree
                            </span>
                        </div>
                    </button>

                    {/* lastrust skin */}
                    <button
                        type="button"
                        onClick={() => onSelectSkin('lastrust')}
                        className="group relative bg-[#0B0F19] border border-slate-700/50 rounded-2xl p-8 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 text-left"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="text-emerald-400" />
                        </div>
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                            Clear.Flow
                        </h3>
                        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                            Modern financial rail for personal wealth.
                            Features automated matching, document pipelines, and real-time net worth tracking.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                                Cloud Sync
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                                Auto-Match
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                                Documents
                            </span>
                        </div>
                    </button>
                </div>

                <p className="text-center text-slate-500 text-sm mt-8">
                    You can switch skins anytime from settings
                </p>
            </div>
        </div>
    );
};

export default DualEntrySplash;
