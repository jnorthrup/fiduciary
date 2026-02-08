import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import config from '../config/env-config.js';

const { PLAID } = config;

/**
 * Initialize the Plaid client
 */
const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID.PLAID_ENV || 'sandbox'],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': PLAID.PLAID_CLIENT_ID,
            'PLAID-SECRET': PLAID.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

export default plaidClient;
