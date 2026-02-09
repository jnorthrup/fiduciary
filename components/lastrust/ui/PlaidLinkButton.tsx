import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Link as LinkIcon } from 'lucide-react';
import { apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { Button } from './Primitives';

export const PlaidLinkButton: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { push } = useToast();
    const [linkToken, setLinkToken] = useState<string | null>(null);

    useEffect(() => {
        const fetchLinkToken = async () => {
            try {
                const data = await apiPost<any>('/banking/plaid/create-link-token');
                setLinkToken(data.link_token);
            } catch (err: any) {
                console.error('Failed to fetch link token:', err);
                push('error', 'Failed to initialize bank connection.');
            }
        };
        fetchLinkToken();
    }, [push]);

    const { open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess: async (public_token, metadata) => {
            try {
                await apiPost('/banking/plaid/exchange-public-token', {
                    public_token,
                    institution_name: metadata.institution?.name
                });
                push('success', `Successfully connected to ${metadata.institution?.name}!`);
                onSuccess();
            } catch (err: any) {
                push('error', 'Failed to connect bank account.');
            }
        },
        onExit: (err, metadata) => {
            if (err) console.error('Plaid Link Exit Error:', err);
        },
    });

    return (
        <Button
            onClick={() => open()}
            disabled={!ready}
            variant="ghost"
            className="flex items-center gap-2"
        >
            <LinkIcon className="w-4 h-4" />
            Connect Bank
        </Button>
    );
};
