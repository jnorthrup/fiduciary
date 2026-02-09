import React from 'react';

export const PageShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children}
    </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>{children}</div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{children}</label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${props.className || ''}`}
    />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${props.className || ''}`}
    />
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
    variant = 'primary',
    className,
    ...props
}) => {
    const base =
        variant === 'primary'
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : variant === 'danger'
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
    return (
        <button {...props} className={`px-4 py-2 rounded-lg text-sm font-semibold ${base} ${className || ''}`}>
            {props.children}
        </button>
    );
};

export const Table: React.FC<{ columns: string[]; rows: any[]; empty?: string; renderCell?: (row: any, col: string) => React.ReactNode }> = ({
    columns,
    rows,
    empty = 'No records found.',
    renderCell
}) => (
    <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                    {columns.map(col => (
                        <th key={col} className="px-4 py-3 text-left font-semibold">
                            {col.replace(/_/g, ' ')}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                    <tr>
                        <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-400">
                            {empty}
                        </td>
                    </tr>
                )}
                {rows.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50">
                        {columns.map(col => (
                            <td key={col} className="px-4 py-3 text-slate-700">
                                {renderCell ? renderCell(row, col) : row[col]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const ChartCard: React.FC<{ title: string; series: any[] }> = ({ title, series }) => (
    <Card>
        <div className="text-sm uppercase text-slate-400 font-semibold">{title}</div>
        <div className="grid grid-cols-12 gap-1 items-end h-32">
            {series.slice(-12).map((point, idx) => (
                <div
                    key={idx}
                    className="bg-slate-900/80 rounded-sm"
                    style={{ height: `${Math.min(100, Math.max(6, (point?.y ?? point?.value ?? 0) / 10))}%` }}
                />
            ))}
        </div>
    </Card>
);
