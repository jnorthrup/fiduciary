/**
 * Skin system type definitions
 */

import { ThemePreference } from '../contexts/ThemeContext';

export type SkinType = 'current' | 'mobile' | 'quickbooks' | 'advanced-graph';

export interface Skin {
    id: SkinType;
    name: string;
    description: string;
    thumbnailUrl?: string;
    features: string[];
    bestFor: string;
}

export const SKINS: Record<SkinType, Skin> = {
    current: {
        id: 'current',
        name: 'Standard Ledger',
        description: 'The classic Fiduciary interface optimized for desktop workflows.',
        features: ['Sidebar navigation', 'Dense tables', 'Standard metrics'],
        bestFor: 'General trust administration'
    },
    mobile: {
        id: 'mobile',
        name: 'Mobile Touch',
        description: 'Optimized for phones and tablets with bottom navigation and large touch targets.',
        features: ['Bottom navigation', 'Card views', 'Touch gestures', 'Simplified dashboard'],
        bestFor: 'On-the-go review and approvals'
    },
    quickbooks: {
        id: 'quickbooks',
        name: 'Accountant View',
        description: 'Familiar layout for accounting professionals used to QuickBooks Online.',
        features: ['Left sidebar tree', 'Green accent theme', 'Register view', 'Keyboard shortcuts'],
        bestFor: 'Accounting and bookkeeping tasks'
    },
    'advanced-graph': {
        id: 'advanced-graph',
        name: 'Data Analyst',
        description: 'High-density dashboard with advanced visualization capabilities.',
        features: ['Widget grid', 'Complex charts', 'Real-time data', 'Customizable layout'],
        bestFor: 'Portfolio analysis and reporting'
    }
};
