import React, { useState } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import * as types from '../types';
import { AccountForm } from './AccountForm';
import { AccountActivity } from './AccountActivity';
import { 
  FolderTree, List, Plus, Search, Filter, 
  ChevronRight, ChevronDown, Edit2, Trash2, 
  CreditCard, DollarSign, PieChart, Wallet, Receipt,
  Activity
} from 'lucide-react';

interface Props {
  entityId: string;
}

const TYPE_ICONS: Record<types.AccountType, any> = {
  [types.AccountType.ASSET]: Wallet,
  [types.AccountType.LIABILITY]: CreditCard,
  [types.AccountType.EQUITY]: PieChart,
  [types.AccountType.INCOME]: DollarSign,
  [types.AccountType.EXPENSE]: Receipt,
};

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

interface TreeNodeProps {
  account: types.Account;
  level: number;
  onEdit: (account: types.Account) => void;
  onDelete: (id: string) => void;
  onViewActivity: (account: types.Account) => void;
}

const AccountTreeNode: React.FC<TreeNodeProps> = ({ account, level, onEdit, onDelete, onViewActivity }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = account.children && account.children.length > 0;
  const Icon = TYPE_ICONS[account.type];

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 px-3 hover:bg-slate-50 border-b border-slate-50 group transition-colors ${
          level === 0 ? 'bg-white' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <div className="mr-2 w-4 flex justify-center">
          {hasChildren && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div 
          className="flex items-center flex-1 cursor-pointer"
          onClick={() => onViewActivity(account)}
        >
          <Icon className={`w-4 h-4 mr-2 ${
            account.type === types.AccountType.ASSET ? 'text-emerald-500' :
            account.type === types.AccountType.LIABILITY ? 'text-red-500' :
            account.type === types.AccountType.EQUITY ? 'text-blue-500' :
            account.type === types.AccountType.INCOME ? 'text-emerald-600' :
            'text-amber-500'
          }`} />
          
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="font-mono text-xs text-slate-500 mr-2 bg-slate-100 px-1.5 rounded">
                {account.code}
              </span>
              <span className={`text-sm font-medium ${!account.isActive ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {account.name}
              </span>
            </div>
            {account.description && (
              <span className="text-[10px] text-slate-400 truncate max-w-xs pl-0.5">
                {account.description}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right mr-4">
             <span className={`font-mono text-sm ${account.balance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
            <button
              onClick={() => onViewActivity(account)}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="View History"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(account)}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Account"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete Account"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {account.children!.map(child => (
            <AccountTreeNode 
              key={child.id} 
              account={child} 
              level={level + 1} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              onViewActivity={onViewActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AccountManager: React.FC<Props> = ({ entityId }) => {
  const { getAccounts, getAccountHierarchy, deleteAccount } = useLedgerStore();
  
  // UI State
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [showForm, setShowForm] = useState(false);
  const [viewingActivityAccount, setViewingActivityAccount] = useState<types.Account | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<types.Account | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<types.AccountType | 'All'>('All');
  
  // Data Query
  const hierarchy = getAccountHierarchy(entityId);
  const flatAccounts = getAccounts({ 
    entityId, 
    type: selectedType === 'All' ? undefined : selectedType,
    searchTerm: searchTerm || undefined 
  });

  // Actions
  const handleEdit = (account: types.Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      const result = deleteAccount(id);
      if (result.errors.length > 0) {
        alert(result.errors[0].message);
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(undefined);
  };

  const handleViewActivity = (account: types.Account) => {
    setViewingActivityAccount(account);
  };

  const handleCloseActivity = () => {
    setViewingActivityAccount(undefined);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative">
      
      {/* HEADER */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Chart of Accounts</h2>
          <p className="text-xs text-slate-500">Manage ledger accounts and hierarchy</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'tree' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Tree View"
            >
              <FolderTree className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Account
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search accounts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {['All', ...Object.values(types.AccountType)].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors border ${
                selectedType === type
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        {viewMode === 'tree' && !searchTerm && selectedType === 'All' ? (
          // TREE VIEW
          <div className="divide-y divide-slate-100 bg-white min-h-full">
            {hierarchy.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No accounts found. Create one to get started.
              </div>
            ) : (
              hierarchy.map(account => (
                <AccountTreeNode 
                  key={account.id} 
                  account={account} 
                  level={0} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onViewActivity={handleViewActivity}
                />
              ))
            )}
          </div>
        ) : (
          // LIST VIEW (or Search/Filter active)
          <div className="divide-y divide-slate-100 bg-white min-h-full">
            {flatAccounts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No accounts match your filters.
              </div>
            ) : (
              flatAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between py-3 px-6 hover:bg-slate-50 group border-b border-slate-50">
                   <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      account.type === types.AccountType.ASSET ? 'bg-emerald-500' :
                      account.type === types.AccountType.LIABILITY ? 'bg-red-500' :
                      account.type === types.AccountType.EQUITY ? 'bg-blue-500' :
                      'bg-amber-500'
                    }`} />
                    <div className="cursor-pointer" onClick={() => handleViewActivity(account)}>
                      <div className="flex items-center">
                        <span className="font-mono text-xs text-slate-500 mr-2 bg-slate-100 px-1.5 rounded">{account.code}</span>
                        <span className="text-sm font-medium text-slate-700">{account.name}</span>
                      </div>
                      <div className="flex text-[10px] text-slate-400 space-x-2 mt-0.5">
                        <span>{account.type}</span>
                        <span>•</span>
                        <span>{account.accountClass}</span>
                      </div>
                    </div>
                   </div>

                   <div className="flex items-center space-x-6">
                      <span className="font-mono text-sm text-slate-600">
                        {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 transition-opacity">
                        <button onClick={() => handleViewActivity(account)} className="text-slate-400 hover:text-indigo-600" title="View History">
                          <Activity className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(account)} className="text-slate-400 hover:text-blue-600" title="Edit Account">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(account.id)} className="text-slate-400 hover:text-red-600" title="Delete Account">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* FORM MODAL OVERLAY */}
      {showForm && (
        <div className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <AccountForm 
              entityId={entityId}
              initialData={editingAccount}
              onSave={handleCloseForm}
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}

      {/* ACTIVITY OVERLAY */}
      {viewingActivityAccount && (
        <div className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-sm p-4 lg:p-8">
          <AccountActivity 
            account={viewingActivityAccount} 
            onClose={handleCloseActivity} 
          />
        </div>
      )}

    </div>
  );
};
