/**
 * Gmail Integration Demo Component
 * Shows how to use Gmail OAuth hook and client
 */

import React, { useState } from 'react';
import { useGmailOAuth, GmailConnectButton, GmailStatus } from '../hooks/useGmailOAuth';
import { GmailClient } from '../services/gmailClient';

export const GmailIntegrationDemo: React.FC = () => {
  // Configure your Google OAuth Client ID from Google Cloud Console
  const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID || '';

  const { isConnected, isLoading, error, profile, connect, disconnect, simulateLogin, getClient } =
    useGmailOAuth({
      clientId: GMAIL_CLIENT_ID,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
    });

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      const client = getClient();

      // List recent messages
      const result = await client.listMessages({ maxResults: 10 });

      // Fetch full message details
      const fullMessages = await Promise.all(
        result.messages.map((msg) => client.getMessage(msg.id))
      );

      setMessages(fullMessages);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      alert(`Failed to fetch messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!isConnected) return;

    try {
      setLoading(true);
      const client = getClient();

      await client.sendMessage({
        to: ['test@example.com'],
        subject: 'Test Email from Trust Ledger',
        textBody: 'This is a test email sent via Gmail API.',
        htmlBody: '<p>This is a <strong>test email</strong> sent via Gmail API.</p>',
      });

      alert('Test email sent successfully!');
    } catch (err: any) {
      console.error('Failed to send email:', err);
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gmail-integration-demo p-6 bg-slate-900 rounded-lg border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-4">Gmail Integration Demo</h2>

      {!GMAIL_CLIENT_ID ? (
        <div className="p-4 bg-amber-900/30 border border-amber-700 rounded-lg text-amber-200">
          <p className="font-medium mb-2">Google Client ID not configured</p>
          <p className="text-sm">
            Set <code className="bg-slate-800 px-2 py-1 rounded">VITE_GMAIL_CLIENT_ID</code> in your
            environment variables. Get your client ID from{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Google Cloud Console
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          {/* Connection Section */}
          <div className="mb-6">
            <GmailConnectButton
              isConnected={isConnected}
              isLoading={isLoading}
              onConnect={connect}
              onDisconnect={disconnect}
            />

            {!isConnected && !isLoading && (
              <button
                onClick={simulateLogin}
                className="ml-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded border border-slate-600 transition-colors"
                title="Use hardcoded credentials for UI testing"
              >
                Simulate Demo Login
              </button>
            )}
            <GmailStatus isConnected={isConnected} profile={profile} error={error} />
          </div>

          {/* Actions Section */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={fetchMessages}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Loading...' : 'Fetch Recent Messages'}
                </button>
                <button
                  onClick={sendTestEmail}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>

              {/* Messages Display */}
              {messages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-3">Recent Messages</h3>
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-white">
                              {GmailClient.getHeader(message, 'From') || 'Unknown'}
                            </p>
                            <p className="text-sm text-slate-400">
                              {GmailClient.getHeader(message, 'Subject') || '(No subject)'}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(parseInt(message.internalDate || '0')).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2">
                          {message.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Usage Info */}
          <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Usage</h3>
            <pre className="text-xs text-slate-400 overflow-x-auto">
              {`// Import hook
import { useGmailOAuth } from './hooks/useGmailOAuth';

// Use in component
const { isConnected, connect, getClient } = useGmailOAuth({
  clientId: 'YOUR_CLIENT_ID',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly']
});

// Fetch messages
const client = getClient();
const messages = await client.listMessages({ maxResults: 10 });`}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};
