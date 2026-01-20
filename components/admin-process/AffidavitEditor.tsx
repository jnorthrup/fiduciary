import React, { useState, useEffect } from 'react';
import { TemplateEngine } from '../../server/lib/affidavit-template';
import { OC10CapacityTemplate } from '../../server/lib/templates/OC10Capacity';
import { OriginalIssuerTemplate } from '../../server/lib/templates/OriginalIssuer';
import { UsuryAssignmentTemplate } from '../../server/lib/templates/UsuryAssignment';
import { Affidavit, Claim } from '../../types/admin-process';
import { PreviewPane } from './PreviewPane';
import { CitationPicker } from './CitationPicker';
import { Citation } from '../../types/citation-database';
import { AffidavitValidator, ValidationError, ValidationSeverity } from '../../server/lib/affidavit-validator';

export const AffidavitEditor: React.FC = () => {
    const [engine] = useState(() => {
        const e = new TemplateEngine();
        e.registerTemplate(OC10CapacityTemplate);
        e.registerTemplate(OriginalIssuerTemplate);
        e.registerTemplate(UsuryAssignmentTemplate);
        return e;
    });

    const [validator] = useState(() => new AffidavitValidator());
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

    const [selectedTemplateName, setSelectedTemplateName] = useState<string>('OC10Capacity');
    const [variables, setVariables] = useState<Record<string, string>>({
        affiantName: '',
        affiantTitle: '',
        entityName: '',
        entityType: 'LLC',
        resolutionDate: '',
        instrumentDate: '',
        creditorName: '',
        originalAmount: '',
        interestRate: '',
        stateLimit: '',
        lenderName: '',
        state: ''
    });

    const [affidavit, setAffidavit] = useState<Partial<Affidavit>>({});
    const [showCitationPicker, setShowCitationPicker] = useState(false);
    const [activeClaimIndex, setActiveClaimIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-generate affidavit draft when variables change
    useEffect(() => {
        try {
            setError(null);
            const template = engine['templates'].get(selectedTemplateName);

            if (!template) return;

            try {
                const draft = engine.renderTemplate(template, variables);
                setAffidavit(draft);

                // Run validation on the generated draft
                const result = validator.validate(draft);
                setValidationErrors(result.errors);

            } catch (e: any) {
                if (!e.message.includes('is required')) {
                    setError(e.message);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, [selectedTemplateName, variables, engine, validator]);

    const handleVariableChange = (key: string, value: string) => {
        setVariables(prev => ({ ...prev, [key]: value }));
    };

    const handleAddCitation = (citation: Citation) => {
        if (activeClaimIndex === null || !affidavit.claims) return;

        const updatedClaims = [...affidavit.claims];
        const claim = updatedClaims[activeClaimIndex];

        if (!claim.supportingCitations) {
            claim.supportingCitations = [];
        }

        claim.supportingCitations.push(citation);

        setAffidavit(prev => ({ ...prev, claims: updatedClaims }));
        setShowCitationPicker(false);
        setActiveClaimIndex(null);
    };

    const getErrorForField = (field: string) => {
        return validationErrors.find(e => e.field === field);
    };

    return (
        <div className="flex h-screen bg-gray-100 p-4 gap-4">
            {/* Editor Panel */}
            <div className="w-1/2 bg-white rounded shadow-lg p-6 overflow-y-auto">
                <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Draft Affidavit</h2>

                {/* Validation Summary */}
                {validationErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <strong>Validation Issues:</strong>
                        <ul className="list-disc list-inside mt-1">
                            {validationErrors.slice(0, 3).map((err, idx) => (
                                <li key={idx}>{err.message}</li>
                            ))}
                            {validationErrors.length > 3 && <li>...and {validationErrors.length - 3} more</li>}
                        </ul>
                    </div>
                )}

                {/* Template Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                        aria-label="Select Template"
                        value={selectedTemplateName}
                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="OC10Capacity">OC-10 Capacity / Authority</option>
                        <option value="OriginalIssuer">Original Issuer (Promissory Note)</option>
                        <option value="UsuryAssignment">Usury Violation & Assignment</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        {selectedTemplateName === 'OC10Capacity' && 'Establishes borrowing authority under Fed Operating Circular 10.'}
                        {selectedTemplateName === 'OriginalIssuer' && 'Asserts status as creator of a credit instrument.'}
                        {selectedTemplateName === 'UsuryAssignment' && 'Calculates and assigns claims for excessive interest.'}
                    </p>
                </div>

                {/* Dynamic Form Fields based on Template */}
                <div className="mb-8 space-y-4">
                    <h3 className="font-semibold text-gray-700">Inputs</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Affiant Name</label>
                            <input
                                aria-label="Affiant Name"
                                type="text"
                                value={variables.affiantName}
                                onChange={e => handleVariableChange('affiantName', e.target.value)}
                                className={`w-full p-2 border rounded ${getErrorForField('affiant.name') ? 'border-red-500 bg-red-50' : ''}`}
                            />
                            {getErrorForField('affiant.name') && (
                                <span className="text-xs text-red-500">Required</span>
                            )}
                        </div>

                        {selectedTemplateName !== 'UsuryAssignment' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500">Title / Capacity</label>
                                <input
                                    aria-label="Title / Capacity"
                                    type="text"
                                    value={variables.affiantTitle}
                                    onChange={e => handleVariableChange('affiantTitle', e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        )}

                        {selectedTemplateName === 'OC10Capacity' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Entity Name</label>
                                    <input
                                        aria-label="Entity Name"
                                        type="text"
                                        value={variables.entityName}
                                        onChange={e => handleVariableChange('entityName', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Entity Type</label>
                                    <select
                                        aria-label="Entity Type"
                                        value={variables.entityType}
                                        onChange={e => handleVariableChange('entityType', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    >
                                        <option value="LLC">LLC</option>
                                        <option value="Corporation">Corporation</option>
                                        <option value="Trust">Trust</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500">Resolution Date (Optional)</label>
                                    <input
                                        aria-label="Resolution Date"
                                        type="date"
                                        value={variables.resolutionDate}
                                        onChange={e => handleVariableChange('resolutionDate', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                            </>
                        )}

                        {selectedTemplateName === 'OriginalIssuer' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Instrument Date</label>
                                    <input
                                        aria-label="Instrument Date"
                                        type="date"
                                        value={variables.instrumentDate}
                                        onChange={e => handleVariableChange('instrumentDate', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Creditor Name</label>
                                    <input
                                        aria-label="Creditor Name"
                                        type="text"
                                        value={variables.creditorName}
                                        onChange={e => handleVariableChange('creditorName', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500">Original Amount</label>
                                    <input
                                        aria-label="Original Amount"
                                        type="text"
                                        value={variables.originalAmount}
                                        onChange={e => handleVariableChange('originalAmount', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                            </>
                        )}

                        {selectedTemplateName === 'UsuryAssignment' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">State</label>
                                    <input
                                        aria-label="State"
                                        type="text"
                                        value={variables.state}
                                        onChange={e => handleVariableChange('state', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Lender Name</label>
                                    <input
                                        aria-label="Lender Name"
                                        type="text"
                                        value={variables.lenderName}
                                        onChange={e => handleVariableChange('lenderName', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Interest Rate (%)</label>
                                    <input
                                        aria-label="Interest Rate"
                                        type="number"
                                        value={variables.interestRate}
                                        onChange={e => handleVariableChange('interestRate', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">State Limit (%)</label>
                                    <input
                                        aria-label="State Limit"
                                        type="number"
                                        value={variables.stateLimit}
                                        onChange={e => handleVariableChange('stateLimit', e.target.value)}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                {/* Manual Edits */}
                {affidavit.claims && (
                    <div className="mb-8">
                        <h3 className="font-semibold text-gray-700 mb-2">Claim Customization</h3>
                        <div className="space-y-4">
                            {affidavit.claims.map((claim, idx) => (
                                <div key={idx} className="p-3 border rounded bg-gray-50">
                                    <textarea
                                        className={`w-full p-2 text-sm border rounded mb-2 h-20 ${getErrorForField(`claims[${idx}].description`) ? 'border-red-500' : ''}`}
                                        value={claim.description}
                                        onChange={(e) => {
                                            const newClaims = [...(affidavit.claims || [])];
                                            newClaims[idx] = { ...claim, description: e.target.value };
                                            setAffidavit(prev => ({ ...prev, claims: newClaims }));
                                        }}
                                    />
                                    {getErrorForField(`claims[${idx}].description`) && (
                                        <div className="text-xs text-red-500 mb-2">Description required</div>
                                    )}

                                    <div className="flex justify-between items-center text-xs">
                                        <span className={`text-gray-500 ${getErrorForField(`claims[${idx}].legalBasis`) ? 'text-red-500 font-bold' : ''}`}>
                                            Basis: {claim.legalBasis}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setActiveClaimIndex(idx);
                                                setShowCitationPicker(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            + Add Legal Authority
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 overflow-y-auto relative">
                <PreviewPane affidavit={affidavit} />

                {showCitationPicker && (
                    <div className="absolute top-10 left-10 right-10 z-50">
                        <CitationPicker
                            onSelect={handleAddCitation}
                            onCancel={() => {
                                setShowCitationPicker(false);
                                setActiveClaimIndex(null);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
