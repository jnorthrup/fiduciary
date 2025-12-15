import React from 'react';
import { Entity, Employee, PayrollRun } from '../types';
import { Users, Briefcase, DollarSign, UserPlus, GitFork, UserCheck, UserMinus, Activity } from 'lucide-react';

interface Props {
  entity: Entity;
  employees: Employee[];
  payrollRuns: PayrollRun[];
}

export const HRHeadcountViewer: React.FC<Props> = ({ entity, employees, payrollRuns }) => {
  const entityEmployees = employees.filter(e => e.entityId === entity.id);
  const activeEmployees = entityEmployees.filter(e => e.status === 'Active');
  
  // Calculate Departments
  const depts = Array.from(new Set(activeEmployees.map(e => e.department)));

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          HR Headcount & Accounting
        </h2>
        <p className="text-sm text-slate-500 mt-1">Org Chart, Headcount Metrics, and Payroll Accounting Workflow</p>
      </div>

      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <StatCard title="Active Headcount" value={activeEmployees.length} icon={Users} color="bg-blue-100 text-blue-600" />
         <StatCard title="Departments" value={depts.length} icon={GitFork} color="bg-purple-100 text-purple-600" />
         <StatCard title="Payroll Runs (YTD)" value={payrollRuns.filter(r => r.entityId === entity.id).length} icon={Activity} color="bg-emerald-100 text-emerald-600" />
         <StatCard title="Open Roles" value="1" icon={UserPlus} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* 2. Org Hierarchy Visualizer */}
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Organizational Hierarchy</h3>
            <div className="bg-white p-6 rounded-xl border border-slate-200 min-h-[400px]">
                {depts.map(dept => (
                    <div key={dept} className="mb-8 last:mb-0">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{dept}</span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeEmployees.filter(e => e.department === dept).map(emp => (
                                <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50 transition-colors group">
                                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-200 group-hover:text-indigo-700">
                                        {emp.firstName[0]}{emp.lastName[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{emp.firstName} {emp.lastName}</div>
                                        <div className="text-xs text-slate-500">{emp.role}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-1">${(emp.salary/1000).toFixed(0)}k/yr • {emp.payFrequency}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
         </div>

         {/* 3. HR Accounting Usecases / Workflow */}
         <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Hire-to-Retire Workflow</h3>
            
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pl-6 py-2">
                
                {/* Recruitment */}
                <div className="relative">
                    <div className="absolute -left-[33px] bg-slate-100 p-1.5 rounded-full border border-slate-200">
                        <UserPlus size={16} className="text-slate-500" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">1. Recruitment</h4>
                    <p className="text-xs text-slate-500 mt-1">Define role, budget salary, open requisition.</p>
                </div>

                {/* Onboarding */}
                <div className="relative">
                    <div className="absolute -left-[33px] bg-amber-50 p-1.5 rounded-full border border-amber-200">
                        <UserCheck size={16} className="text-amber-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">2. Onboarding (Accounting)</h4>
                    <p className="text-xs text-slate-500 mt-1">Collect W-4 & I-9. Set up payroll profile. Determine tax withholding state.</p>
                    <div className="mt-2 bg-amber-50 p-2 rounded text-[10px] text-amber-800 border border-amber-100">
                        <strong>Impact:</strong> Creates Employee record in Ledger.
                    </div>
                </div>

                {/* Payroll (The Accounting Core) */}
                <div className="relative">
                    <div className="absolute -left-[33px] bg-indigo-50 p-1.5 rounded-full border border-indigo-200">
                        <DollarSign size={16} className="text-indigo-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">3. Payroll Cycle (Bi-Weekly)</h4>
                    <p className="text-xs text-slate-500 mt-1">Calculate Gross Pay. Withhold Taxes. Distribute Net Pay.</p>
                    
                    <div className="mt-2 bg-indigo-50 p-2 rounded text-[10px] text-indigo-800 border border-indigo-100 font-mono space-y-1">
                        <div>DR Salaries Expense (Gross)</div>
                        <div>DR Tax Expense (Employer)</div>
                        <div>CR Tax Liabilities</div>
                        <div>CR Cash (Net)</div>
                    </div>
                </div>

                {/* Separation */}
                <div className="relative">
                    <div className="absolute -left-[33px] bg-slate-100 p-1.5 rounded-full border border-slate-200">
                        <UserMinus size={16} className="text-slate-500" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">4. Separation</h4>
                    <p className="text-xs text-slate-500 mt-1">Final pay calculation. COBRA notice. Archive records.</p>
                </div>

            </div>
         </div>

      </div>
    </div>
  );
};