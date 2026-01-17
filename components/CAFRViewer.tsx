/**
 * CAFR Viewer Component
 *
 * Displays the PDF document for a selected CAFR.
 */

import React, { useState, useEffect } from 'react';
import { ExternalLink, Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { cafrApi, type CAFRDocument } from '../services/cafrApiClient';

interface Props {
    document?: CAFRDocument;
}

export const CAFRViewer: React.FC<Props> = ({ document }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (document?.id) {
            loadPdfUrl(document.id);
        } else {
            setPdfUrl(null);
            setError(null);
        }
    }, [document?.id]);

    const loadPdfUrl = async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const url = await cafrApi.getPdfUrl(id);
            setPdfUrl(url);
        } catch (e: any) {
            setError(e.message || 'Failed to load PDF URL');
        } finally {
            setIsLoading(false);
        }
    };

    if (!document) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
                <div className="p-4 bg-slate-800 rounded-full mb-4">
                    <FileText className="text-slate-500" size={48} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Document Selected</h3>
                <p className="text-slate-400 max-w-xs">
                    Select a CAFR to view the document
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">{document.entityName}</h2>
                    <p className="text-sm text-slate-400">
                        {document.state} • FY {document.fiscalYear} • CAFR Document
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {pdfUrl && (
                        <>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <ExternalLink size={16} />
                                View Fullscreen
                            </a>
                            <a
                                href={pdfUrl}
                                download
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <Download size={16} />
                                Download
                            </a>
                        </>
                    )}
                </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative min-h-[600px]">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10">
                        <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
                        <p className="text-white">Loading document...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <AlertCircle className="text-red-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">Failed to load document</h3>
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={() => loadPdfUrl(document.id)}
                            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {pdfUrl && !isLoading && !error && (
                    <iframe
                        src={`${pdfUrl}#toolbar=0`}
                        title="CAFR Document Viewer"
                        className="w-full h-full border-none"
                    />
                )}
            </div>
        </div>
    );
};
