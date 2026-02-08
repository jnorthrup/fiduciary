
import React from 'react';
import { useSkin } from '../../contexts/SkinContext';
import { Github, Code, GitBranch, ArrowLeft, ExternalLink, Copy } from 'lucide-react';

export const HeatherLayout = () => {
    const { setSkin } = useSkin();
    const repoUrl = "https://github.com/jnorthrup/fiduciary";

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-indigo-50 font-sans text-slate-800 p-8 flex flex-col items-center justify-center">
            <div className="max-w-3xl w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
                <div className="bg-gradient-to-r from-rose-400 to-indigo-400 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10 flex items-center space-x-6">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                            <Github className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Heather Skin Project</h1>
                            <p className="text-rose-100 text-lg">Collaboration & Merge Interface</p>
                        </div>
                    </div>
                </div>

                <div className="p-12 space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-start space-x-4">
                            <div className="bg-rose-100 p-2 rounded-lg text-rose-600 mt-1">
                                <GitBranch className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Merge Intent</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    The module you are looking for lives in a separate tree. The intent is to merge the <strong>Heather</strong> tree when we have full visibility.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mt-1">
                                <Code className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Contribution Guide</h3>
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    To contribute or view the source, please fork the repository and submit a Pull Request.
                                </p>

                                <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between group">
                                    <code className="text-rose-300 font-mono text-sm">{repoUrl}</code>
                                    <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white" title="Open in GitHub">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                        <button
                            onClick={() => setSkin('current')}
                            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Standard View
                        </button>

                        <a
                            href={`${repoUrl}/fork`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1 flex items-center"
                        >
                            <GitBranch className="w-5 h-5 mr-2" />
                            Fork Repository
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
