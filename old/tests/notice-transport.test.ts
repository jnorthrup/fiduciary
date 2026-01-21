import { describe, it, expect } from 'vitest';
import {
  EventIdentifier,
  createEventId,
  EventMetadata,
  createEventMetadata,
  NoticeTemplate,
  ConditionalAcceptanceTemplate,
  NoticeOfFaultTemplate,
  CertificateOfServiceTemplate,
  ResponseTemplate,
  DefaultDeclarationTemplate,
  EventChain,
  TransportEvent,
  createSendEvent,
  validateEventId,
  validateEventChain,
  calculateDeadline
} from '../types/notice-transport';

describe('Event Identifier', () => {
  it('should create valid event ID for notice', () => {
    const id: EventIdentifier = createEventId('NOTICE');
    expect(id.type).toBe('NOTICE');
    expect(id.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(id.uniqueId).toMatch(/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/);
  });

  it('should validate event ID format', () => {
    const validId: EventIdentifier = {
      type: 'NOTICE',
      timestamp: '2025-01-14T12:00:00Z',
      uniqueId: 'abc123def456abc123def456abc123de' // 32 hex chars
    };
    expect(validateEventId(validId)).toBe(true);

    const invalidId = { type: 'NOTICE', timestamp: 'invalid', uniqueId: 'abc' };
    expect(validateEventId(invalidId)).toBe(false);
  });
});

describe('Event Metadata', () => {
  it('should create complete event metadata', () => {
    const metadata: EventMetadata = createEventMetadata('NOTICE', 'test-chain');
    expect(metadata.eventId.type).toBe('NOTICE');
    expect(metadata.status).toBe('Draft');
    expect(metadata.chainId).toBe('test-chain');
    expect(metadata.parentEventId).toBeNull();
  });

  it('should support parent event reference', () => {
    const parentId: EventIdentifier = createEventId('NOTICE');
    const metadata: EventMetadata = createEventMetadata('RESPONSE', 'chain-1', parentId);
    expect(metadata.parentEventId).toEqual(parentId);
  });
});

describe('Notice Template', () => {
  it('should create basic notice structure', () => {
    const notice: NoticeTemplate = {
      header: 'NOTICE',
      date: 'January 14, 2025 • 12:00 PM',
      from: {
        name: 'John Doe',
        entity: 'Doe Enterprises'
      },
      to: {
        name: 'Jane Smith',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701'
        }
      },
      subject: {
        type: 'Conditional Acceptance',
        reference: 'CA-000001-2025'
      },
      body: {
        preamble: 'PLEASE TAKE NOTICE',
        statements: ['Test statement'],
        demand: 'Performance required',
        deadline: '14 days from service'
      },
      signature: {
        printName: 'John Doe',
        title: 'Authorized Representative',
        date: '2025-01-14'
      }
    };

    expect(notice.header).toBe('NOTICE');
    expect(notice.from.name).toBe('John Doe');
    expect(notice.to.address.state).toBe('IL');
  });
});

describe('Conditional Acceptance Template', () => {
  it('should create conditional acceptance with conditions', () => {
    const ca: ConditionalAcceptanceTemplate = {
      header: 'CONDITIONAL ACCEPTANCE',
      reference: {
        noticeType: 'NOTICE',
        referenceNumber: 'NOTICE-000001-2025',
        date: '2025-01-14'
      },
      acceptanceStatement: 'I hereby conditionally accept your offer to contract upon full performance of the following conditions:',
      conditions: [
        'Provide verification under penalty of perjury',
        'Include notarized affidavit supporting claims'
      ],
      closingStatement: 'This matter will be considered closed, settled, and finalized upon full performance.',
      deadline: {
        days: 14,
        deadlineDate: '2025-01-28'
      },
      signature: {
        printName: 'John Doe',
        title: 'Authorized Representative'
      }
    };

    expect(ca.conditions).toHaveLength(2);
    expect(ca.conditions[0]).toContain('verification');
  });
});

describe('Notice of Fault Template', () => {
  it('should create notice of fault with fault items', () => {
    const nof: NoticeOfFaultTemplate = {
      header: 'NOTICE OF FAULT AND OPPORTUNITY TO CURE',
      reference: {
        originalNotice: 'NOTICE-000001-2025',
        servedDate: '2025-01-14'
      },
      faultIdentification: 'Your notice fails to include:',
      faults: [
        'Missing verification under penalty of perjury',
        'No affidavit of truth supporting claims',
        'Missing notarized affidavit'
      ],
      curePeriod: {
        days: 10,
        cureDeadline: '2025-01-24'
      },
      signature: {
        printName: 'John Doe',
        title: 'Authorized Representative'
      }
    };

    expect(nof.faults).toHaveLength(3);
    expect(nof.curePeriod.days).toBe(10);
  });
});

describe('Certificate of Service Template', () => {
  it('should create certificate for certified mail', () => {
    const cos: CertificateOfServiceTemplate = {
      header: 'CERTIFICATE OF SERVICE',
      certificationStatement: 'I hereby certify that a true and correct copy of the foregoing document was served on',
      deliveryMethod: {
        type: 'Certified Mail',
        trackingNumber: '7401234560000000000001',
        recipientAddress: '123 Main St, Springfield, IL 62701'
      },
      recipient: {
        name: 'Jane Smith',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701'
      },
      serviceDate: 'January 14, 2025',
      signature: {
        printName: 'John Doe',
        title: 'Process Server'
      }
    };

    expect(cos.deliveryMethod.type).toBe('Certified Mail');
    expect(cos.deliveryMethod.trackingNumber).toMatch(/^\d{22}$/);
  });

  it('should create certificate for email delivery', () => {
    const cos: CertificateOfServiceTemplate = {
      header: 'CERTIFICATE OF SERVICE',
      certificationStatement: 'I hereby certify that a true and correct copy of the foregoing document was served on',
      deliveryMethod: {
        type: 'Email',
        emailAddress: 'recipient@example.com',
        readReceipt: true
      },
      recipient: {
        name: 'Jane Smith',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701'
      },
      serviceDate: 'January 14, 2025',
      signature: {
        printName: 'John Doe',
        title: 'Authorized Representative'
      }
    };

    expect(cos.deliveryMethod.type).toBe('Email');
    expect(cos.deliveryMethod.readReceipt).toBe(true);
  });
});

describe('Response Template', () => {
  it('should create acceptance response', () => {
    const response: ResponseTemplate = {
      header: 'RESPONSE: ACCEPTANCE',
      reference: {
        originalNotice: 'NOTICE-000001-2025',
        date: '2025-01-14'
      },
      responseType: 'Acceptance',
      body: {
        acceptanceStatement: 'I accept your notice in its entirety.',
        acceptanceDetails: 'All terms acknowledged'
      },
      signature: {
        printName: 'Jane Smith',
        title: 'Authorized Representative'
      }
    };

    expect(response.responseType).toBe('Acceptance');
    expect(response.body.acceptanceStatement).toContain('accept');
  });

  it('should create rebuttal response', () => {
    const response: ResponseTemplate = {
      header: 'RESPONSE: REBUTTAL',
      reference: {
        originalNotice: 'NOTICE-000001-2025',
        date: '2025-01-14'
      },
      responseType: 'Rebuttal',
      body: {
        rebuttalStatement: 'I hereby rebut your notice on the following grounds:',
        rebuttalPoints: [
          {
            point: 'Your claims lack factual basis',
            supportingCitation: 'See: Affidavit of Truth dated 2025-01-10'
          }
        ]
      },
      signature: {
        printName: 'Jane Smith',
        title: 'Authorized Representative'
      }
    };

    expect(response.responseType).toBe('Rebuttal');
    expect(response.body.rebuttalPoints).toHaveLength(1);
  });

  it('should create counter-notice', () => {
    const response: ResponseTemplate = {
      header: 'RESPONSE: COUNTER-NOTICE',
      reference: {
        originalNotice: 'NOTICE-000001-2025',
        date: '2025-01-14'
      },
      responseType: 'Counter-Notice',
      body: {
        counterNoticeHeader: 'COUNTER-NOTICE is hereby served regarding your reference: NOTICE-000001-2025',
        counterClaims: 'Your notice contains the following defects:',
        defectList: [
          'Failure to state claim with particularity',
          'No supporting documentation attached'
        ],
        demandStatement: 'Correct these defects within 10 days'
      },
      signature: {
        printName: 'Jane Smith',
        title: 'Authorized Representative'
      }
    };

    expect(response.responseType).toBe('Counter-Notice');
    expect(response.body.defectList).toHaveLength(2);
  });
});

describe('Default Declaration Template', () => {
  it('should create default by acquiescence', () => {
    const defaultDec: DefaultDeclarationTemplate = {
      header: 'DECLARATION OF DEFAULT BY ACQUIESCENCE',
      background: {
        reference: 'NOTICE-000001-2025',
        serviceDate: '2025-01-14',
        deadline: '2025-01-28'
      },
      defaultStatement: 'The above-referenced notice has not been responded to within the required time period. By failure to respond, the recipient has acquiesced to all claims and demands.',
      consequences: [
        'All claims in the notice are admitted as fact',
        'Debt is established as valid and owed',
        'Default judgment may be entered'
      ],
      affiantStatement: 'I, John Doe, affirm under penalty of perjury that the above is true and correct.',
      notaryJurat: {
        state: 'Illinois',
        county: 'Sangamon',
        date: '2025-01-29',
        notaryName: 'Notary Public',
        commissionExpires: '2026-12-31'
      }
    };

    expect(defaultDec.consequences).toHaveLength(3);
    expect(defaultDec.notaryJurat.county).toBe('Sangamon');
  });
});

describe('Event Chain', () => {
  it('should create event chain with notice and response', () => {
    const noticeId: EventIdentifier = createEventId('NOTICE');
    const responseId: EventIdentifier = createEventId('RESPONSE');

    const chain: EventChain = {
      chainId: 'CHAIN-2025-01-14-001',
      rootEvent: noticeId,
      events: [noticeId, responseId],
      status: 'Open',
      createdAt: '2025-01-14T12:00:00Z',
      updatedAt: '2025-01-15T12:00:00Z'
    };

    expect(chain.events).toHaveLength(2);
    expect(chain.status).toBe('Open');
    expect(validateEventChain(chain)).toBe(true);
  });

  it('should detect defaulted chain', () => {
    const noticeId: EventIdentifier = createEventId('NOTICE');
    const defaultId: EventIdentifier = createEventId('DEFAULT');

    const chain: EventChain = {
      chainId: 'CHAIN-2025-01-14-002',
      rootEvent: noticeId,
      events: [noticeId, defaultId],
      status: 'Defaulted',
      createdAt: '2025-01-14T12:00:00Z',
      updatedAt: '2025-01-29T12:00:00Z'
    };

    expect(chain.status).toBe('Defaulted');
  });
});

describe('Transport Event', () => {
  it('should create send event', () => {
    const eventId: EventIdentifier = createEventId('NOTICE');
    const transport: TransportEvent = createSendEvent(eventId, 'recipient-001', 'Certified Mail');

    expect(transport.type).toBe('SEND');
    expect(transport.recipientId).toBe('recipient-001');
    expect(transport.deliveryMethod).toBe('Certified Mail');
    expect(transport.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

describe('Deadline Calculation', () => {
  it('should calculate 14-day deadline from service date', () => {
    const serviceDate = '2025-01-14';
    const deadline = calculateDeadline(serviceDate, 14);

    expect(deadline).toBe('2025-01-28');
  });

  it('should calculate 10-day cure period', () => {
    const serviceDate = '2025-01-14';
    const deadline = calculateDeadline(serviceDate, 10);

    expect(deadline).toBe('2025-01-24');
  });

  it('should handle month boundaries', () => {
    const serviceDate = '2025-01-28';
    const deadline = calculateDeadline(serviceDate, 14);

    expect(deadline).toBe('2025-02-11');
  });
});
