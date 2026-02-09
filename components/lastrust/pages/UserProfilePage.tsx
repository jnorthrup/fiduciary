import React from 'react';
import { useAuth } from '../../../services/authService';
import { PageShell, Card } from '../ui/Primitives';

export const UserProfilePage: React.FC = () => {
    const { user, signIn, signOut } = useAuth();

    return (
        <PageShell title="User Profile" subtitle={user ? 'Manage your account.' : 'Sign in to access your data.'}>
            {!user ? (
                <Card className="p-8 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400">GU</div>
                    <p className="text-sm text-slate-500">You are browsing as a guest.</p>
                    <button
                        onClick={() => signIn().catch(() => { })}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
                        Sign in with Google
                    </button>
                </Card>
            ) : (
                <Card className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                                {(user.email || 'U').slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{user.displayName || 'User'}</h3>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            {user.emailVerified && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-slate-200 pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">User ID</span>
                            <span className="text-slate-700 font-mono text-xs">{user.uid}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Role</span>
                            <span className="text-slate-700">Member</span>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => signOut()}
                            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </Card>
            )}
        </PageShell>
    );
};
