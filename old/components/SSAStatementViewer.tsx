
import React from 'react';
import { SSAStatement } from '../types';
import { ShieldCheck, TrendingUp, CheckCircle2, Lock } from 'lucide-react';

interface Props {
  statement: SSAStatement;
}

export const SSAStatementViewer: React.FC<Props> = ({ statement }) => {
  const isQualified = statement.eligibilityStatus === 'Qualified';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-w-4xl mx-auto my-8">
       {/* Fake SSA Header */}
       <div className="bg-[#0b3d91] text-white p-6 border-b-4 border-yellow-500">
           <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                   <ShieldCheck size={40} className="text-white" />
                   <div>
                       <h1 className="text-2xl font-serif font-bold tracking-wide">Social Security</h1>
                       <p className="text-sm font-sans opacity-90">The Official Website of the U.S. Social Security Administration</p>
                   </div>
               </div>
               <div className="text-right">
                   <div className="text-xs font-bold uppercase tracking-widest opacity-70">Statement Date</div>
                   <div className="font-mono">{new Date(statement.lastUpdated).toLocaleDateString()}</div>
               </div>
           </div>
       </div>

       <div className="p-8">
           <div className="flex justify-between items-start mb-8">
               <div>
                   <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Social Security Statement</h2>
                   <p className="text-slate-600">Review your earnings history and estimated benefits.</p>
               </div>
               <div className={`px-4 py-2 rounded-full border-2 font-bold flex items-center gap-2 ${isQualified ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                   {isQualified ? <CheckCircle2 size={20} /> : <Lock size={20} />}
                   {statement.eligibilityStatus === 'Qualified' ? 'QUALIFIED FOR BENEFITS' : 'NOT YET QUALIFIED'}
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               
               {/* Retirement Estimates */}
               <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                   <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                       <TrendingUp className="text-blue-600" /> Estimated Retirement Benefits
                   </h3>
                   <div className="space-y-6">
                       <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                           <span className="text-sm font-bold text-slate-600">At Full Retirement Age (67):</span>
                           <span className="text-3xl font-bold text-slate-800">${statement.estimatedRetirementBenefit.toLocaleString()}<span className="text-sm text-slate-400 font-normal">/mo</span></span>
                       </div>
                       <div className="flex justify-between items-end border-b border-slate-200 pb-2 opacity-75">
                           <span className="text-sm text-slate-600">At Age 70:</span>
                           <span className="text-xl font-bold text-slate-700">${(statement.estimatedRetirementBenefit * 1.24).toLocaleString()}<span className="text-sm text-slate-400 font-normal">/mo</span></span>
                       </div>
                       <div className="flex justify-between items-end border-b border-slate-200 pb-2 opacity-75">
                           <span className="text-sm text-slate-600">At Early Retirement (62):</span>
                           <span className="text-xl font-bold text-slate-700">${(statement.estimatedRetirementBenefit * 0.7).toLocaleString()}<span className="text-sm text-slate-400 font-normal">/mo</span></span>
                       </div>
                   </div>
                   
                   {!isQualified && (
                       <div className="mt-4 text-xs text-red-500 bg-red-50 p-2 rounded">
                           * You have not earned enough credits yet to qualify for these benefits.
                       </div>
                   )}
               </div>

               {/* Earnings Record */}
               <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-inner">
                   <h3 className="text-lg font-bold text-slate-700 mb-4">Earnings Record</h3>
                   <table className="w-full text-sm">
                       <thead>
                           <tr className="border-b-2 border-slate-800 text-left">
                               <th className="pb-2">Year</th>
                               <th className="pb-2 text-right">Taxed Social Security</th>
                               <th className="pb-2 text-right">Taxed Medicare</th>
                           </tr>
                       </thead>
                       <tbody className="font-mono text-slate-600">
                           {/* Historical Rows (Fake) */}
                           <tr className="border-b border-slate-100">
                               <td className="py-2">2023</td>
                               <td className="py-2 text-right text-slate-300">$0</td>
                               <td className="py-2 text-right text-slate-300">$0</td>
                           </tr>
                           <tr className="border-b border-slate-100">
                               <td className="py-2">2024</td>
                               <td className="py-2 text-right text-slate-300">$0</td>
                               <td className="py-2 text-right text-slate-300">$0</td>
                           </tr>
                           {/* Current Year (The Impact) */}
                           <tr className="bg-yellow-50 font-bold text-slate-900">
                               <td className="py-2 pl-2 border-l-4 border-yellow-400">{statement.currentYear}</td>
                               <td className="py-2 text-right">${statement.taxedSocialSecurityEarnings.toLocaleString()}</td>
                               <td className="py-2 text-right pr-2">${statement.taxedMedicareEarnings.toLocaleString()}</td>
                           </tr>
                       </tbody>
                   </table>

                   <div className="mt-6">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Total Credits:</span>
                            <span className="font-bold">{statement.credits} / 40</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${(statement.credits / 40) * 100}%` }}></div>
                        </div>
                   </div>
               </div>

           </div>

           <div className="mt-8 text-center text-xs text-slate-400 italic">
               "This is right to the horse's mouth... You guys can see my before and afters."
           </div>
       </div>
    </div>
  );
};
