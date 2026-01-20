import React, { useState, useEffect } from 'react';
import { Citation, searchCitations, formatCitationMLA, formatCitationBluebook } from '../../types/citation-database';

interface CitationPickerProps {
    onSelect: (citation: Citation) => void;
    onCancel: () => void;
}

export const CitationPicker: React.FC<CitationPickerProps> = ({ onSelect, onCancel }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Citation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                setLoading(true);
                // Simulate async search for realism, though underlying implementation is sync for now
                const searchResults = searchCitations(query);
                setResults(searchResults);
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (citation: Citation) => {
        onSelect(citation);
    };

    return (
        <div className="bg-white p-4 rounded shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add Citation</h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    &times;
                </button>
            </div>

            <input
                type="text"
                placeholder="Search statutes, cases (e.g., 'UCC 3-105', 'Federal Reserve')"
                className="w-full p-2 border rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
            />

            {loading && <div className="text-gray-500 text-sm">Searching...</div>}

            <div className="max-h-60 overflow-y-auto">
                {results.length > 0 ? (
                    <ul className="space-y-2">
                        {results.map((citation) => {
                            const formatted = citation.type === 'statute'
                                ? formatCitationMLA(citation as any)
                                : formatCitationBluebook(citation as any);

                            const id = citation.type === 'statute'
                                ? `${citation.type}-${(citation as any).title}-${(citation as any).section}`
                                : `${citation.type}-${(citation as any).title}-${(citation as any).docket}`;


                            return (
                                <li
                                    key={id}
                                    className="p-2 hover:bg-blue-50 cursor-pointer rounded border border-transparent hover:border-blue-200"
                                    onClick={() => handleSelect(citation)}
                                >
                                    <div className="font-medium text-gray-900">{citation.title}</div>
                                    <div className="text-sm text-gray-600 truncate">{formatted}</div>
                                    <div className="text-xs text-blue-600 mt-1 uppercase tracking-wider">{citation.type}</div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    query.length >= 2 && !loading && (
                        <div className="text-gray-500 text-sm text-center py-4">No citations found.</div>
                    )
                )}
            </div>
        </div>
    );
};
