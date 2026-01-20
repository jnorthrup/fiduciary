
import React from 'react';

export const IRSLoginModal = ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null;
    return (
        <div data-testid="mock-irs-login-modal">
            <div>Mock IRS Login Modal</div>
            <button onClick={onClose}>Close</button>
            <button onClick={() => onSuccess({ username: 'test_user', tcc: 'AA-1234567' })}>
                Simulate Success
            </button>
        </div>
    );
};
