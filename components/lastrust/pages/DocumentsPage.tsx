import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Trash2, Eye } from 'lucide-react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useAuth } from '../../../services/authService';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Button } from '../ui/Primitives';

export const DocumentsPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const { user } = useAuth();
    const [docs, setDocs] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(() => {
        return apiGet<any[]>('/documents').then(setDocs);
    }, []);

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load documents.'));
    }, [load, push]);

    const handleUpload = async () => {
        setUploading(true);
        try {
            await new Promise(r => setTimeout(r, 1000));
            const name = `receipt_${Date.now()}.pdf`;
            await apiPost('/documents/upload', {
                name,
                size: Math.floor(Math.random() * 1024 * 1024),
                type: 'application/pdf'
            });
            push('success', `Uploaded ${name}`);
            await load();
        } catch (e) {
            push('error', 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <PageShell title="Rail / Documents" subtitle="Manage receipts and evidential documents.">
            {railTabs}
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
                    <Button onClick={handleUpload} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map((doc, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3 group hover:border-slate-300 transition-colors">
                            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                <FileText className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate" title={doc.name}>
                                    {doc.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {(doc.size / 1024).toFixed(1)} KB &middot; {new Date(doc.created_at || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-700">
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-slate-700">
                                    <Download className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 hover:bg-white rounded text-rose-500 hover:text-rose-700">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {docs.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                            No documents found.
                        </div>
                    )}
                </div>
            </Card>
        </PageShell>
    );
};
