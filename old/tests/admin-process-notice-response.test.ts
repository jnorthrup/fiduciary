import { describe, it, expect } from 'vitest';
import {
  Notice,
  Response,
  NoticeType,
  DeliveryMethod,
  ResponseType,
  ProofOfDelivery,
  validateNotice,
  validateResponse
} from '../types/admin-process';

describe('Notice Type', () => {
  describe('NoticeType enum values', () => {
    it('should accept all valid notice types', () => {
      const validTypes: NoticeType[] = [
        'ConditionalAcceptance',
        'NoticeOfFault',
        'NoticeOfDefault',
        'OpportunityToCure',
        'AffidavitOfTruth',
        'CertificateOfService'
      ];

      validTypes.forEach(type => {
        expect(type).toBeTruthy();
      });
    });
  });

  describe('DeliveryMethod enum values', () => {
    it('should accept all valid delivery methods', () => {
      const validMethods: DeliveryMethod[] = [
        'CertifiedMail',
        'Email',
        'Fax',
        'PersonalService',
        'AffidavitDelivery'
      ];

      validMethods.forEach(method => {
        expect(method).toBeTruthy();
      });
    });
  });

  describe('Notice interface', () => {
    it('should validate a complete notice', () => {
      const notice: Notice = {
        id: 'notice-001',
        type: 'ConditionalAcceptance',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Conditional Acceptance of Contract Terms',
        content: 'I conditionally accept your offer upon proof of claim...',
        deliveryMethod: 'CertifiedMail',
        sentDate: '2026-01-14T00:00:00Z',
        responseDeadline: '2026-02-13T00:00:00Z',
        status: 'Sent'
      };

      expect(notice.id).toBe('notice-001');
      expect(notice.type).toBe('ConditionalAcceptance');
      expect(notice.deliveryMethod).toBe('CertifiedMail');
    });

    it('should require notice id', () => {
      const invalidNotice = {
        type: 'ConditionalAcceptance' as NoticeType,
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test',
        deliveryMethod: 'CertifiedMail' as DeliveryMethod,
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should require sender id', () => {
      const invalidNotice = {
        id: 'notice-002',
        type: 'ConditionalAcceptance' as NoticeType,
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test',
        deliveryMethod: 'CertifiedMail' as DeliveryMethod,
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('senderId'))).toBe(true);
    });

    it('should require recipient id', () => {
      const invalidNotice = {
        id: 'notice-003',
        type: 'ConditionalAcceptance' as NoticeType,
        senderId: 'sender-123',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test',
        deliveryMethod: 'CertifiedMail' as DeliveryMethod,
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('recipientId'))).toBe(true);
    });

    it('should require recipient address', () => {
      const invalidNotice = {
        id: 'notice-004',
        type: 'ConditionalAcceptance' as NoticeType,
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        subject: 'Test',
        content: 'Test',
        deliveryMethod: 'CertifiedMail' as DeliveryMethod,
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('recipientAddress'))).toBe(true);
    });

    it('should require delivery method', () => {
      const invalidNotice = {
        id: 'notice-005',
        type: 'ConditionalAcceptance' as NoticeType,
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test',
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('deliveryMethod'))).toBe(true);
    });

    it('should require sent date', () => {
      const invalidNotice = {
        id: 'notice-006',
        type: 'ConditionalAcceptance' as NoticeType,
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test',
        deliveryMethod: 'CertifiedMail' as DeliveryMethod,
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('sentDate'))).toBe(true);
    });

    it('should require notice content', () => {
      const invalidNotice = {
        id: 'notice-007',
        type: 'ConditionalAcceptance' as NoticeType,
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        deliveryMethod: 'CertifiedMail' as DeliveryMethod,
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Draft' as const
      };

      const result = validateNotice(invalidNotice as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('content'))).toBe(true);
    });

    it('should accept notice with optional proof of delivery', () => {
      const notice: Notice = {
        id: 'notice-008',
        type: 'ConditionalAcceptance',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test content',
        deliveryMethod: 'CertifiedMail',
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Sent',
        proofOfDelivery: {
          method: 'CertifiedMail',
          trackingNumber: 'CN123456789US',
          deliveryDate: '2026-01-16T00:00:00Z',
          signature: 'John Doe'
        }
      };

      expect(notice.proofOfDelivery).toBeDefined();
      expect(notice.proofOfDelivery?.trackingNumber).toBe('CN123456789US');
    });

    it('should accept notice with optional response', () => {
      const notice: Notice = {
        id: 'notice-009',
        type: 'ConditionalAcceptance',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        recipientAddress: {
          street: '789 Oak St',
          city: 'Springfield',
          state: 'IL',
          zip: '62702'
        },
        subject: 'Test',
        content: 'Test content',
        deliveryMethod: 'CertifiedMail',
        sentDate: '2026-01-14T00:00:00Z',
        status: 'Accepted',
        response: {
          id: 'response-001',
          noticeId: 'notice-009',
          type: 'Acceptance',
          content: 'We accept your conditional acceptance',
          receivedDate: '2026-01-20T00:00:00Z'
        }
      };

      expect(notice.response).toBeDefined();
      expect(notice.response?.type).toBe('Acceptance');
    });
  });

  describe('ProofOfDelivery interface', () => {
    it('should validate complete proof of delivery', () => {
      const pod: ProofOfDelivery = {
        method: 'CertifiedMail',
        trackingNumber: 'CN123456789US',
        deliveryDate: '2026-01-16T00:00:00Z',
        signature: 'John Doe',
        attachmentUrl: 'https://example.com/proof.pdf'
      };

      expect(pod.method).toBe('CertifiedMail');
      expect(pod.trackingNumber).toBe('CN123456789US');
    });
  });
});

describe('Response Type', () => {
  describe('ResponseType enum values', () => {
    it('should accept all valid response types', () => {
      const validTypes: ResponseType[] = [
        'Acceptance',
        'Rebuttal',
        'CounterNotice',
        'Default'
      ];

      validTypes.forEach(type => {
        expect(type).toBeTruthy();
      });
    });
  });

  describe('Response interface', () => {
    it('should validate a complete response', () => {
      const response: Response = {
        id: 'response-001',
        noticeId: 'notice-001',
        type: 'Acceptance',
        content: 'We accept your notice and will proceed accordingly.',
        receivedDate: '2026-01-20T00:00:00Z',
        attachments: ['doc-001', 'doc-002']
      };

      expect(response.id).toBe('response-001');
      expect(response.noticeId).toBe('notice-001');
      expect(response.type).toBe('Acceptance');
      expect(response.attachments).toHaveLength(2);
    });

    it('should require response id', () => {
      const invalidResponse = {
        noticeId: 'notice-001',
        type: 'Acceptance' as ResponseType,
        content: 'Test',
        receivedDate: '2026-01-20T00:00:00Z'
      };

      const result = validateResponse(invalidResponse as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should require notice id', () => {
      const invalidResponse = {
        id: 'response-002',
        type: 'Acceptance' as ResponseType,
        content: 'Test',
        receivedDate: '2026-01-20T00:00:00Z'
      };

      const result = validateResponse(invalidResponse as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('noticeId'))).toBe(true);
    });

    it('should require response type', () => {
      const invalidResponse = {
        id: 'response-003',
        noticeId: 'notice-001',
        content: 'Test',
        receivedDate: '2026-01-20T00:00:00Z'
      };

      const result = validateResponse(invalidResponse as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });

    it('should require content', () => {
      const invalidResponse = {
        id: 'response-004',
        noticeId: 'notice-001',
        type: 'Acceptance' as ResponseType,
        receivedDate: '2026-01-20T00:00:00Z'
      };

      const result = validateResponse(invalidResponse as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('content'))).toBe(true);
    });

    it('should require received date', () => {
      const invalidResponse = {
        id: 'response-005',
        noticeId: 'notice-001',
        type: 'Acceptance' as ResponseType,
        content: 'Test'
      };

      const result = validateResponse(invalidResponse as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('receivedDate'))).toBe(true);
    });

    it('should accept response without attachments', () => {
      const response: Response = {
        id: 'response-006',
        noticeId: 'notice-001',
        type: 'Rebuttal',
        content: 'We reject your claims for the following reasons...',
        receivedDate: '2026-01-20T00:00:00Z'
      };

      expect(response.attachments).toBeUndefined();
    });

    it('should support all response types', () => {
      const types: ResponseType[] = ['Acceptance', 'Rebuttal', 'CounterNotice', 'Default'];

      types.forEach(type => {
        const response: Response = {
          id: `response-${type}`,
          noticeId: 'notice-001',
          type,
          content: `Test ${type} content`,
          receivedDate: '2026-01-20T00:00:00Z'
        };

        expect(response.type).toBe(type);
      });
    });
  });
});
