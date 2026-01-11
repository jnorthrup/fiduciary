import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LedgerProvider } from './services/ledgerService';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <LedgerProvider>
      <App />
    </LedgerProvider>
  );
}
