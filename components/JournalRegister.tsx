import React from 'react';
import { JournalEntry, DCFlag } from '../types';

interface Props {
  journals: JournalEntry[];
  entityId: string;
}

export const JournalRegister: React.FC<Props> = ({ journals, entityId }) => {
  const entityJournals = journals.filter(j => j.entityId === entityId);

  if (entityJournals.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400 text-sm">No journal entries recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Journal Register</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {entityJournals.map(journal => (
          <div key={journal.id} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">{journal.date}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{journal.type}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{journal.id.slice(0, 8)}</span>
            </div>
            
            <p className="text-sm text-slate-800 font-medium mb-3">{journal.memo}</p>
            
            <div className="bg-slate-50 rounded border border-slate-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-200">
                    <th className="text-left py-1.5 px-3 font-medium">Account</th>
                    <th className="text-right py-1.5 px-3 font-medium w-24">Debit</th>
                    <th className="text-right py-1.5 px-3 font-medium w-24">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journal.lines.map(line => (
                    <tr key={line.id}>
                      <td className="py-1.5 px-3 text-slate-700">
                        <span className="font-mono text-slate-400 mr-2">{line.accountCode}</span>
                        {line.accountName}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                        {line.dc === DCFlag.Debit ? line.amount.toFixed(2) : ''}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                        {line.dc === DCFlag.Credit ? line.amount.toFixed(2) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};