/**
 * Sponsor Configuration for NACHA File Generation
 *
 * Sponsors represent the originating entities in ACH transactions.
 * Each sponsor has ODFI (Originating Depository Financial Institution)
 * details used in NACHA file headers.
 */

/**
 * Default test sponsor
 * Uses routing number 091000019 which is designated for testing
 */
const DEFAULT_TEST_SPONSOR = {
  id: 'test-sponsor-1',
  name: 'TEST SPONSOR',
  odfiRouting: '091000019',
  companyId: '1234567890',
  immediateOriginName: 'TEST SPONSOR'
};

/**
 * Production sponsors (configured via environment variables)
 * In production, these values would be provided by the bank
 */
const getProductionSponsor = () => {
  const odfiRouting = process.env.ODFI_ROUTING;
  const companyId = process.env.COMPANY_ID;
  const companyName = process.env.COMPANY_NAME;

  if (odfiRouting && companyId && companyName) {
    return {
      id: 'production',
      name: companyName,
      odfiRouting,
      companyId,
      immediateOriginName: companyName
    };
  }

  return null;
};

/**
 * Get sponsor configuration
 * Returns production sponsor if available, otherwise falls back to test sponsor
 *
 * @param {string} sponsorId - Optional sponsor ID (for multi-tenant systems)
 * @returns {Object} Sponsor configuration
 */
export function getSponsor(sponsorId) {
  const production = getProductionSponsor();

  // If production config exists, use it
  if (production) {
    return production;
  }

  // Otherwise use default test sponsor
  return DEFAULT_TEST_SPONSOR;
}

/**
 * Get all available sponsors
 * @returns {Array<Object>} Array of sponsor configurations
 */
export function getAllSponsors() {
  const production = getProductionSponsor();
  const sponsors = [DEFAULT_TEST_SPONSOR];

  if (production) {
    sponsors.push(production);
  }

  return sponsors;
}

export default { getSponsor, getAllSponsors };
