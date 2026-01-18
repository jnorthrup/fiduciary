/**
 * Gmail API Client
 * Wrapper for Gmail REST API v1
 */

import { getGmailOAuthService } from './gmailOAuth';

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: GmailMessagePayload;
  internalDate?: string;
  sizeEstimate?: number;
}

export interface GmailMessagePayload {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailMessageHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePayload[];
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageBody {
  size?: number;
  data?: string; // Base64 encoded
}

export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages?: GmailMessage[];
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  type?: 'system' | 'user';
}

export class GmailClient {
  private readonly BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    const response = await this.fetch('/profile');
    return response.json();
  }

  /**
   * List messages
   */
  async listMessages(params?: {
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
    q?: string; // Search query
  }): Promise<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }> {
    const searchParams = new URLSearchParams();
    if (params?.labelIds) {
      searchParams.append('labelIds', params.labelIds.join(','));
    }
    if (params?.maxResults) {
      searchParams.append('maxResults', params.maxResults.toString());
    }
    if (params?.pageToken) {
      searchParams.append('pageToken', params.pageToken);
    }
    if (params?.q) {
      searchParams.append('q', params.q);
    }

    const response = await this.fetch(`/messages?${searchParams}`);
    return response.json();
  }

  /**
   * Get a specific message
   */
  async getMessage(id: string, params?: {
    format?: 'full' | 'metadata' | 'minimal' | 'raw';
    metadataHeaders?: string[];
  }): Promise<GmailMessage> {
    const searchParams = new URLSearchParams();
    if (params?.format) {
      searchParams.append('format', params.format);
    }
    if (params?.metadataHeaders) {
      searchParams.append('metadataHeaders', params.metadataHeaders.join(','));
    }

    const response = await this.fetch(`/messages/${id}?${searchParams}`);
    return response.json();
  }

  /**
   * Get message attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<GmailMessageBody> {
    const response = await this.fetch(`/messages/${messageId}/attachments/${attachmentId}`);
    return response.json();
  }

  /**
   * List threads
   */
  async listThreads(params?: {
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
  }): Promise<{ threads: Array<{ id: string; snippet: string; historyId: string }>; nextPageToken?: string }> {
    const searchParams = new URLSearchParams();
    if (params?.labelIds) {
      searchParams.append('labelIds', params.labelIds.join(','));
    }
    if (params?.maxResults) {
      searchParams.append('maxResults', params.maxResults.toString());
    }
    if (params?.pageToken) {
      searchParams.append('pageToken', params.pageToken);
    }

    const response = await this.fetch(`/threads?${searchParams}`);
    return response.json();
  }

  /**
   * Get a specific thread
   */
  async getThread(id: string, params?: {
    format?: 'full' | 'metadata' | 'minimal';
    metadataHeaders?: string[];
  }): Promise<GmailThread> {
    const searchParams = new URLSearchParams();
    if (params?.format) {
      searchParams.append('format', params.format);
    }
    if (params?.metadataHeaders) {
      searchParams.append('metadataHeaders', params.metadataHeaders.join(','));
    }

    const response = await this.fetch(`/threads/${id}?${searchParams}`);
    return response.json();
  }

  /**
   * List labels
   */
  async listLabels(): Promise<{ labels: GmailLabel[] }> {
    const response = await this.fetch('/labels');
    return response.json();
  }

  /**
   * Get a specific label
   */
  async getLabel(id: string): Promise<GmailLabel> {
    const response = await this.fetch(`/labels/${id}`);
    return response.json();
  }

  /**
   * Send a message
   */
  async sendMessage(message: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    textBody?: string;
    htmlBody?: string;
    threadId?: string;
  }): Promise<GmailMessage> {
    // Build RFC 822 message
    const email = [
      message.to ? `To: ${message.to.join(', ')}` : '',
      message.cc ? `Cc: ${message.cc.join(', ')}` : '',
      message.bcc ? `Bcc: ${message.bcc.join(', ')}` : '',
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary"',
      '',
      '--boundary',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      message.textBody || '',
      '',
      '--boundary',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      message.htmlBody || '',
      '',
      '--boundary--',
    ]
      .filter(Boolean)
      .join('\r\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const body = {
      raw: encodedEmail,
      threadId: message.threadId,
    };

    const response = await this.fetch('/messages/send', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * Modify labels on a message
   */
  async modifyMessage(id: string, params: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }): Promise<GmailMessage> {
    const response = await this.fetch(`/messages/${id}/modify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.json();
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string): Promise<void> {
    await this.fetch(`/messages/${id}`, { method: 'DELETE' });
  }

  /**
   * Search messages
   */
  async search(query: string, params?: {
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
  }): Promise<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }> {
    return this.listMessages({ ...params, q: query });
  }

  /**
   * Helper to decode base64 URL encoded text
   */
  static decodeBase64(data: string): string {
    try {
      // Add padding if needed
      const padded = data + '==='.slice(0, (4 - (data.length % 4)) % 4);
      const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
      return decodeURIComponent(
        binary
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return '';
    }
  }

  /**
   * Extract plain text from message payload
   */
  static getPlainText(message: GmailMessage): string {
    const extractFromParts = (parts: GmailMessagePayload[]): string => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return GmailClient.decodeBase64(part.body.data);
        }
        if (part.parts) {
          const text = extractFromParts(part.parts);
          if (text) return text;
        }
      }
      return '';
    };

    if (message.payload) {
      if (message.payload.mimeType === 'text/plain' && message.payload.body?.data) {
        return GmailClient.decodeBase64(message.payload.body.data);
      }
      if (message.payload.parts) {
        return extractFromParts(message.payload.parts);
      }
    }

    return message.snippet || '';
  }

  /**
   * Extract HTML from message payload
   */
  static getHTML(message: GmailMessage): string {
    const extractFromParts = (parts: GmailMessagePayload[]): string => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return GmailClient.decodeBase64(part.body.data);
        }
        if (part.parts) {
          const html = extractFromParts(part.parts);
          if (html) return html;
        }
      }
      return '';
    };

    if (message.payload) {
      if (message.payload.mimeType === 'text/html' && message.payload.body?.data) {
        return GmailClient.decodeBase64(message.payload.body.data);
      }
      if (message.payload.parts) {
        return extractFromParts(message.payload.parts);
      }
    }

    return '';
  }

  /**
   * Get header value from message
   */
  static getHeader(message: GmailMessage, name: string): string | undefined {
    if (!message.payload?.headers) return undefined;
    return message.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  /**
   * Make authenticated fetch request to Gmail API
   */
  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const oauth = getGmailOAuthService();
    const token = await oauth.getToken();

    const response = await fetch(`${this.BASE_URL}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}\n${error}`);
    }

    return response;
  }
}

// Singleton instance
let gmailClient: GmailClient | null = null;

export const getGmailClient = (): GmailClient => {
  if (!gmailClient) {
    gmailClient = new GmailClient();
  }
  return gmailClient;
};
