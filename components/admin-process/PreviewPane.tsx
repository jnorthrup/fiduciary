import React from 'react';
import { Affidavit } from '../../types/admin-process';
import { formatCitationPlain } from '../../types/citation-database';

interface PreviewPaneProps {
    affidavit: Partial<Affidavit>;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ affidavit }) => {
    if (!affidavit.title && !affidavit.claims) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
                <span>Document Preview will appear here</span>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 shadow-md border rounded max-w-4xl mx-auto min-h-[800px] font-serif">
            {/* Header */}
            <h1 className="text-2xl font-bold text-center mb-8 uppercase underline decoration-2 underline-offset-4">
                {affidavit.title || 'AFFIDAVIT'}
            </h1>

            {/* Affiant Intro */}
            {affidavit.affiant && (
                <div className="mb-6 leading-relaxed">
                    <p>
                        <strong>STATE OF {affidavit.affiant.address?.state || '[STATE]'}</strong> )
                    </p>
                    <p>
                        <strong>COUNTY OF {affidavit.affiant.address?.city || '[COUNTY]'}</strong> ) ss:
                    </p>
                    <br />
                    <p>
                        BEFORE ME, the undersigned authority, personally appeared <strong>{affidavit.affiant.name}</strong>, who, known to me to be the <strong>{affidavit.affiant.capacity || 'Affiant'}</strong>, and being first duly sworn, deposes and says:
                    </p>
                </div>
            )}

            {/* Claims */}
            <div className="space-y-6 mb-12">
                {affidavit.claims?.map((claim, index) => (
                    <div key={claim.id || index} className="pl-4 border-l-4 border-transparent hover:border-gray-200">
                        <p className="mb-2">
                            <strong>{index + 1}.</strong> {claim.description}
                        </p>

                        {claim.supportingCitations && claim.supportingCitations.length > 0 && (
                            <div className="ml-8 text-sm text-gray-600 italic">
                                Supporting Authority:
                                <ul className="list-disc ml-4 mt-1">
                                    {claim.supportingCitations.map((cit, i) => (
                                        <li key={i}>{formatCitationPlain(cit)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Signature Block */}
            <div className="mb-12 break-inside-avoid">
                <p className="mb-8">FURTHER AFFIANT SAYETH NAUGHT.</p>

                <div className="flex flex-col items-end mt-12">
                    <div className="w-64 border-t border-black mb-2"></div>
                    <div className="w-64 text-center">
                        <p>{affidavit.affiant?.name || '[Affiant Name]'}</p>
                        <p className="text-sm italic">{affidavit.affiant?.capacity || '[Capacity]'}</p>
                    </div>
                </div>
            </div>

            {/* Notary Block */}
            <div className="border-2 border-gray-300 p-6 rounded bg-gray-50 break-inside-avoid relative">
                {/* Notary Seal Placeholder */}
                <div className="absolute top-4 right-4 w-24 h-24 border-2 border-gray-400 rounded-full flex items-center justify-center text-center text-xs text-gray-400 rotate-[-15deg] opacity-50 pointer-events-none">
                    [NOTARY SEAL PLACEHOLDER]
                </div>

                <h3 className="text-center font-bold mb-4">JURAT / ACKNOWLEDGMENT</h3>
                <p className="mb-6 leading-relaxed">
                    Subscribed and sworn to (or affirmed) before me on this ____ day of ________, 20__, by __________________________, proved to me on the basis of satisfactory evidence to be the person(s) who appeared before me.
                </p>

                <div className="flex justify-between items-end mt-12">
                    <div>
                        <div className="w-48 border-t border-black mb-1"></div>
                        <p className="text-sm">Signature of Notary Public</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">My Commission Expires: ____________</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
