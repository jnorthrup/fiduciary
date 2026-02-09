import React, { useState } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Button, Label, Input } from '../ui/Primitives';

export const LedgerReportsPage: React.FC<{ ledgerTabs: React.ReactNode }> = ({ ledgerTabs }) => {
    const { push } = useToast();
    const [entityId, setEntityId] = useState('');
    const [report, setReport] = useState<any>(null);
    const [statementFile, setStatementFile] = useState<File | null>(null);
    const [ledgerFile, setLedgerFile] = useState<File | null>(null);

    const loadReport = async (type: 'trial-balance' | 'balance-sheet' | 'pl') => {
        try {
            const data = await apiGet(`/ledger/reports/${type}?entity_id=${entityId}`);
            setReport(data);
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to load report.');
        }
    };

    const parseCsv = (text: string) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (!lines.length) return { headers: [], rows: [] };
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1).map(line => {
            const cols = line.split(',');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h] = (cols[idx] || '').trim();
            });
            return row;
        });
        return { headers, rows };
    };

    const importStatements = async () => {
        if (!statementFile) return;
        try {
            const text = await statementFile.text();
            const { rows } = parseCsv(text);
            const items = rows.map((row, idx) => ({
                bank_txn_id: row.bank_txn_id || row.id || `stmt-${Date.now()}-${idx}`,
                posted_at: row.posted_at || row.date || row.posted || '',
                amount: Number(row.amount || 0),
                counterparty: row.counterparty || row.name || '',
                memo: row.memo || row.description || ''
            }));
            await apiPost('/rail/bank/import/batch', { items });
            push('success', `Imported ${items.length} bank transactions.`);
            setStatementFile(null);
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Statement import failed.');
        }
    };

    const importLedger = async () => {
        if (!ledgerFile) return;
        try {
            const text = await ledgerFile.text();
            const { rows } = parseCsv(text);
            const grouped: Record<string, any[]> = {};
            rows.forEach((row, idx) => {
                const key = row.entry_id || row.entry || `row-${idx}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(row);
            });
            const entries = Object.entries(grouped).map(([key, lines]) => {
                const first = lines[0] || {};
                return {
                    memo: first.memo || `Ledger import ${key}`,
                    source_module: 'ledger',
                    external_ref: first.external_ref || key,
                    entity_id: first.entity_id ? Number(first.entity_id) : (entityId ? Number(entityId) : undefined),
                    entry_date: first.entry_date || first.date || new Date().toISOString().split('T')[0],
                    lines: lines.map((line) => ({
                        account_code: line.account_code || line.account || '',
                        debit: Number(line.debit || 0),
                        credit: Number(line.credit || 0),
                        description: line.description || line.memo || ''
                    }))
                };
            });
            for (const entry of entries) {
                await apiPost('/ledger/journal', entry);
            }
            push('success', `Imported ${entries.length} ledger entries.`);
            setLedgerFile(null);
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Ledger import failed.');
        }
    };

    return (
        <PageShell title="Ledger / Reports" subtitle="Trial balance, balance sheet, and P&L.">
            {ledgerTabs}
            <Card className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label>Entity ID</Label>
                        <Input value={entityId} onChange={e => setEntityId(e.target.value)} />
                    </div>
                    <Button type="button" onClick={() => loadReport('trial-balance')}>Trial Balance</Button>
                    <Button type="button" onClick={() => loadReport('balance-sheet')}>Balance Sheet</Button>
                    <Button type="button" onClick={() => loadReport('pl')}>Profit & Loss</Button>
                </div>
                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 overflow-auto">{report ? JSON.stringify(report, null, 2) : 'Run a report to view output.'}</pre>
            </Card>

            <Card className="p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Upload Statements</h3>
                <div className="text-xs text-slate-500">CSV columns supported: date/posted_at, amount, memo/description, counterparty/name, bank_txn_id.</div>
                <input type="file" accept=".csv" onChange={e => setStatementFile(e.target.files?.[0] || null)} className="text-xs text-slate-500" />
                <Button type="button" variant="ghost" onClick={importStatements} disabled={!statementFile}>Import Statements</Button>
            </Card>

            <Card className="p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Upload Ledger CSV</h3>
                <div className="text-xs text-slate-500">CSV columns supported: entry_id, entry_date/date, memo, account_code/account, debit, credit, description, entity_id.</div>
                <input type="file" accept=".csv" onChange={e => setLedgerFile(e.target.files?.[0] || null)} className="text-xs text-slate-500" />
                <Button type="button" variant="ghost" onClick={importLedger} disabled={!ledgerFile}>Import Ledger</Button>
            </Card>
        </PageShell>
    );
};
