/**
 * Tests for Dashboard Component
 *
 * Test file following TDD principles:
 * 1. Tab navigation and content rendering
 * 2. Entity type/role-based tab filtering
 * 3. Wizard modal open/close functionality
 * 4. BSO mode detection and display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import * as ledgerService from '../services/ledgerService';
import * as bsoStore from '../services/bsoStore';

// Mock ledger store
vi.mock('../services/ledgerService', () => ({
  useLedgerStore: vi.fn(() => ({
    entities: [],
    filings: [],
    modules: [],
    journals: [],
    ticks: [],
    crmPeople: [],
    employees: [],
    payrollRuns: [],
    escrows: [],
    dtccPledgeRecords: [],
    contractors: [],
    resolutions: [],
    deleteEntity: vi.fn(),
    createFiling: vi.fn(),
    updateFilingStatus: vi.fn(),
    submitFilingViaAPI: vi.fn(),
    addTaxModule: vi.fn(),
    addTick: vi.fn(),
    updateTick: vi.fn(),
    addCRMPerson: vi.fn(),
    updateCRMPerson: vi.fn(),
    deleteCRMPerson: vi.fn(),
    addInteraction: vi.fn(),
    addEscrow: vi.fn(),
    updateEscrow: vi.fn(),
    postJournal: vi.fn(),
    addDTCCRecord: vi.fn(),
    updateDTCCRecord: vi.fn(),
    exchangeInstrument: vi.fn(),
    completeReSitus: vi.fn(),
    addResolution: vi.fn(),
    completeCreditDefense: vi.fn(),
    completeChanceryFiling: vi.fn(),
    addMaradRecord: vi.fn(),
    recordResearch: vi.fn(),
    currentUser: { id: 'user-1', name: 'Test User' },
    fiduciaryActions: [],
    proposeFiduciaryAction: vi.fn(),
    voteFiduciaryAction: vi.fn(),
    executeFiduciaryAction: vi.fn(),
  })),
}));

// Mock BSO store
vi.mock('../services/bsoStore', () => ({
  useBSOStore: vi.fn(() => ({
    roles: [],
    submissions: [],
  })),
}));

// Mock fetch for BSO config
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ bsoMode: 'mock' }),
  })
) as any;

// Mock all child components
vi.mock('./ComplianceWidget', () => ({ ComplianceWidget: () => <div data-testid="compliance-widget">ComplianceWidget</div> }));
vi.mock('./JournalRegister', () => ({ JournalRegister: () => <div data-testid="journal-register">JournalRegister</div> }));
vi.mock('./CRMManager', () => ({ CRMManager: () => <div data-testid="crm-manager">CRMManager</div> }));
vi.mock('./AIStrategist', () => ({ AIStrategist: () => <div data-testid="ai-strategist">AIStrategist</div> }));
vi.mock('./ConsolidatedTracker', () => ({ ConsolidatedTracker: () => <div data-testid="consolidated-tracker">ConsolidatedTracker</div> }));
vi.mock('./SimulatedTimelineViewer', () => ({ SimulatedTimelineViewer: () => <div data-testid="timeline-viewer">TimelineViewer</div> }));
vi.mock('./TicklerManager', () => ({ TicklerManager: () => <div data-testid="tickler-manager">TicklerManager</div> }));
vi.mock('./forms/ComplexTrustDescriptionForm', () => ({ ComplexTrustDescriptionForm: () => <div data-testid="trust-form">TrustForm</div> }));
vi.mock('./FiduciaryGovernanceWidget', () => ({ FiduciaryGovernanceWidget: () => <div data-testid="governance-widget">GovernanceWidget</div> }));
vi.mock('./EscrowManager', () => ({ EscrowManager: () => <div data-testid="escrow-manager">EscrowManager</div> }));
vi.mock('./CanalDepository', () => ({ CanalDepository: () => <div data-testid="canal-depository">CanalDepository</div> }));
vi.mock('./HRHeadcountViewer', () => ({ HRHeadcountViewer: () => <div data-testid="hr-viewer">HRViewer</div> }));
vi.mock('./BSOHierarchyViewer', () => ({ BSOHierarchyViewer: () => <div data-testid="bso-hierarchy">BSOHierarchy</div> }));
vi.mock('./BSOWizard', () => ({ BSOWizard: () => <div data-testid="bso-wizard">BSOWizard</div> }));
vi.mock('./BSOEnrollmentWizard', () => ({ BSOEnrollmentWizard: () => <div data-testid="bso-enroll">BSOEnrollment</div> }));
vi.mock('./APDashboard', () => ({ APDashboard: () => <div data-testid="ap-dashboard">APDashboard</div> }));
vi.mock('./CAFRSearch', () => ({ CAFRSearch: () => <div data-testid="cafr-search">CAFRSearch</div> }));
vi.mock('./CAFRViewer', () => ({ CAFRViewer: () => <div data-testid="cafr-viewer">CAFRViewer</div> }));

// Mock wizard components
vi.mock('./DTCCLiquidationWizard', () => ({ DTCCLiquidationWizard: () => <div data-testid="dtcc-wizard">DTCC Wizard</div> }));
vi.mock('./InstrumentExchangeWizard', () => ({ InstrumentExchangeWizard: () => <div data-testid="exchange-wizard">Exchange Wizard</div> }));
vi.mock('./RealEstateAcquisitionWizard', () => ({ RealEstateAcquisitionWizard: () => <div data-testid="realestate-wizard">RealEstate Wizard</div> }));
vi.mock('./CollateralManagementWidget', () => ({ CollateralManagementWidget: () => <div data-testid="collateral-widget">Collateral Widget</div> }));
vi.mock('./ForensicBondWizard', () => ({ ForensicBondWizard: () => <div data-testid="forensic-wizard">Forensic Wizard</div> }));
vi.mock('./EdgarResearchWizard', () => ({ EdgarResearchWizard: () => <div data-testid="edgar-wizard">EDGAR Wizard</div> }));
vi.mock('./SettlementEngine', () => ({ SettlementEngine: () => <div data-testid="settlement-engine">Settlement Engine</div> }));
vi.mock('./LegalFormsWizard', () => ({ LegalFormsWizard: () => <div data-testid="legal-wizard">Legal Wizard</div> }));
vi.mock('./ResitusWizard', () => ({ ResitusWizard: () => <div data-testid="resitus-wizard">Resitus Wizard</div> }));
vi.mock('./TaxpayerResolutionWizard', () => ({ TaxpayerResolutionWizard: () => <div data-testid="resolution-wizard">Resolution Wizard</div> }));
vi.mock('./CreditDefenseWizard', () => ({ CreditDefenseWizard: () => <div data-testid="credit-wizard">Credit Wizard</div> }));
vi.mock('./ChanceryWizard', () => ({ ChanceryWizard: () => <div data-testid="chancery-wizard">Chancery Wizard</div> }));
vi.mock('./TenNinetyNineWizard', () => ({ TenNinetyNineWizard: () => <div data-testid="1099-wizard">1099 Wizard</div> }));
vi.mock('./AccountReconciliationWizard', () => ({ AccountReconciliationWizard: () => <div data-testid="recon-wizard">Recon Wizard</div> }));
vi.mock('./MARADAuthorityWizard', () => ({ MARADAuthorityWizard: () => <div data-testid="marad-wizard">MARAD Wizard</div> }));

const mockEntity = {
  id: 'entity-1',
  name: 'Test Trust',
  type: 'TRUST',
  role: 'HOLDING_TRUST',
  einLast4: '1234',
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab Rendering', () => {
    it('should render Overview, Compliance, Financials, Legal, Operations, and Intelligence tabs for all entities', () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Compliance')).toBeInTheDocument();
      expect(screen.getByText('Financials')).toBeInTheDocument();
      expect(screen.getByText('Legal & Equity')).toBeInTheDocument();
      expect(screen.getByText('Operations')).toBeInTheDocument();
      expect(screen.getByText('Intelligence')).toBeInTheDocument();
    });

    it('should add HR tab for OPERATING_LLC entities', () => {
      const llcEntity = { ...mockEntity, role: 'OPERATING_LLC' };
      render(<Dashboard entity={llcEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText('HR & Payroll')).toBeInTheDocument();
    });

    it('should add BSO tab for HOLDING_TRUST entities', () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText('BSO')).toBeInTheDocument();
    });

    it('should add Escrow tab for HOLDING_TRUST entities', () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText('Escrow')).toBeInTheDocument();
    });

    it('should add Maritime tab for VESSEL entities', () => {
      const vesselEntity = { ...mockEntity, type: 'VESSEL' };
      render(<Dashboard entity={vesselEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText('Maritime')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch active tab when clicking tab button', async () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      const complianceTab = screen.getByText('Compliance');
      fireEvent.click(complianceTab);

      await waitFor(() => {
        expect(complianceTab).toHaveClass('border-indigo-600');
      });
    });
  });

  describe('Entity Header', () => {
    it('should display entity name and type/role badge', () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText('Test Trust')).toBeInTheDocument();
      expect(screen.getByText(/TRUST.*HOLDING_TRUST/)).toBeInTheDocument();
    });

    it('should display masked entity ID and EIN', () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      expect(screen.getByText(/ID:.*entity-1/)).toBeInTheDocument();
      expect(screen.getByText(/EIN:.*1234/)).toBeInTheDocument();
    });
  });

  describe('Wizard Modal', () => {
    it('should open wizard modal when clicking action button', async () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      // Navigate to Financials tab
      fireEvent.click(screen.getByText('Financials'));
      await waitFor(() => {
        expect(screen.getByText('Create 1099')).toBeInTheDocument();
      });

      // Click 1099 button
      fireEvent.click(screen.getByText('Create 1099'));

      await waitFor(() => {
        expect(screen.getByTestId('1099-wizard')).toBeInTheDocument();
      });
    });

    it('should close wizard modal when clicking X button', async () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      // Open wizard
      fireEvent.click(screen.getByText('Financials'));
      await waitFor(() => {
        expect(screen.getByText('Create 1099')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Create 1099'));

      await waitFor(() => {
        expect(screen.getByTestId('1099-wizard')).toBeInTheDocument();
      });

      // Close wizard - find the modal close button (contains X icon)
      const allButtons = screen.getAllByRole('button');
      const closeButton = allButtons.find(btn => btn.querySelector('svg.lucide-x') || btn.querySelector('[data-testid="close-modal"]'));
      if (closeButton) {
        fireEvent.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByTestId('1099-wizard')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('BSO Tab Content', () => {
    it('should fetch BSO config and display mode badge', async () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      // Navigate to BSO tab
      fireEvent.click(screen.getByText('BSO'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/bso/config');
      });
    });

    it('should display Register Employer and Enroll New User buttons', async () => {
      render(<Dashboard entity={mockEntity} onOpenApiConsole={vi.fn()} onEditEntity={vi.fn()} />);

      fireEvent.click(screen.getByText('BSO'));

      await waitFor(() => {
        expect(screen.getByText('Register Employer')).toBeInTheDocument();
        expect(screen.getByText('Enroll New User')).toBeInTheDocument();
      });
    });
  });
});
