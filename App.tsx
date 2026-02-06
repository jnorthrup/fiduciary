
import React from 'react';
import { useSkin } from './contexts/SkinContext';
import { StandardLayout } from './components/layouts/StandardLayout';
import { QuickBooksLayout } from './components/layouts/QuickBooksLayout';
import { HeatherLayout } from './components/layouts/HeatherLayout';
const MobileLayout = () => {
  const { setSkin } = useSkin();
  return (
    <div className="p-8 text-center bg-slate-100 h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Mobile Layout</h2>
      <p className="mb-4">Coming in Phase 4</p>
      <button onClick={() => setSkin('current')} className="px-4 py-2 bg-blue-600 text-white rounded">Switch to Standard View</button>
    </div>
  );
};

const AdvancedGraphLayout = () => {
  const { setSkin } = useSkin();
  return (
    <div className="p-8 text-center bg-slate-900 h-screen flex flex-col items-center justify-center text-white">
      <h2 className="text-xl font-bold mb-4">Data Analyst Layout</h2>
      <p className="mb-4">Coming in Phase 6</p>
      <button onClick={() => setSkin('current')} className="px-4 py-2 bg-indigo-500 text-white rounded">Back to Dashboard</button>
    </div>
  );
};

export const App = () => {
  const { activeSkin } = useSkin(); // Route based on skin selection
  switch (activeSkin) {
    case 'mobile':
      return <MobileLayout />;
    case 'quickbooks':
      return <QuickBooksLayout />;
    case 'heather':
      return <HeatherLayout />;
    case 'advanced-graph':
      return <StandardLayout />; // Fallback until implemented
    case 'current':
    default:
      return <StandardLayout />;
  }
};
