// Administrative Process Management System Types

/**
 * Represents an individual or entity making an affidavit
 */
export interface Affiant {
  name: string;
  entityType: 'Individual' | 'Trust' | 'LLC' | 'Corporation' | 'Partnership';
  address: Address;
  capacity?: string; // e.g., "Trustee of the XYZ Trust"
  phoneNumber?: string;
  email?: string;
}

/**
 * Standard address structure
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  aptSuite?: string;
}

/**
 * Citation to a statute or regulation
 */
export interface StatuteCitation {
  type: 'statute';
  title: string;
  url: string;
  section?: string;
  subsection?: string;
  paragraph?: string;
  textSnippet?: string;
}

/**
 * Citation to a court case
 */
export interface CaseCitation {
  type: 'case';
  title: string;
  court: string;
  year: number;
  docket: string;
  holding?: string;
  url?: string;
  parallelCitation?: string;
}

/**
 * Union type for all citation types
 */
export type Citation = StatuteCitation | CaseCitation;

/**
 * A claim or assertion made in an affidavit with supporting legal citations
 */
export interface Claim {
  id: string;
  description: string;
  legalBasis: string;
  supportingCitations: Citation[];
  timestamp: string;
  evidencedBy?: string[]; // Document IDs
}

/**
 * Notary section of an affidavit
 */
export interface NotarySection {
  commissionNumber: string;
  commissionExpires: string;
  notaryName: string;
  notarySignature: string;
  sealPresent: boolean;
  notarizationDate: string;
  state?: string;
  county?: string;
}

/**
 * Complete affidavit document
 */
export interface Affidavit {
  id: string;
  title: string;
  affiant: Affiant;
  claims: Claim[];
  notary?: NotarySection;
  timestamp: string;
  version: number;
  status?: 'Draft' | 'Pending' | 'Notarized' | 'Filed';
  jurat?: string; // Oath wording
  attachments?: string[]; // Document IDs
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an affidavit object
 */
export function validateAffidavit(affidavit: Partial<Affidavit>): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!affidavit.affiant) {
    errors.push('affiant is required');
  } else {
    if (!affidavit.affiant.name) {
      errors.push('affiant.name is required');
    }
    if (!affidavit.affiant.address) {
      errors.push('affiant.address is required');
    } else {
      if (!affidavit.affiant.address.street) {
        errors.push('affiant.address.street is required');
      }
      if (!affidavit.affiant.address.city) {
        errors.push('affiant.address.city is required');
      }
      if (!affidavit.affiant.address.state) {
        errors.push('affiant.address.state is required');
      }
      if (!affidavit.affiant.address.zip) {
        errors.push('affiant.address.zip is required');
      }
    }
  }

  if (!affidavit.claims || affidavit.claims.length === 0) {
    errors.push('affidavit must have at least one claim');
  }

  if (!affidavit.timestamp) {
    errors.push('timestamp is required');
  }

  if (affidavit.notary) {
    if (!affidavit.notary.commissionNumber) {
      errors.push('notary.commissionNumber is required');
    }
    if (!affidavit.notary.notaryName) {
      errors.push('notary.notaryName is required');
    }
    if (!affidavit.notary.notarizationDate) {
      errors.push('notary.notarizationDate is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a claim object
 */
export function validateClaim(claim: Partial<Claim>): ValidationResult {
  const errors: string[] = [];

  if (!claim.description) {
    errors.push('claim.description is required');
  }

  if (!claim.legalBasis) {
    errors.push('claim.legalBasis is required');
  }

  if (!claim.supportingCitations) {
    errors.push('claim.supportingCitations is required');
  } else {
    claim.supportingCitations.forEach((citation, index) => {
      if (citation.type === 'statute') {
        const statute = citation as StatuteCitation;
        if (!statute.url) {
          errors.push(`supportingCitations[${index}].url is required for statute`);
        }
        if (!statute.title) {
          errors.push(`supportingCitations[${index}].title is required for statute`);
        }
      } else if (citation.type === 'case') {
        const caseCit = citation as CaseCitation;
        if (!caseCit.court) {
          errors.push(`supportingCitations[${index}].court is required for case`);
        }
        if (!caseCit.year) {
          errors.push(`supportingCitations[${index}].year is required for case`);
        }
        if (!caseCit.docket) {
          errors.push(`supportingCitations[${index}].docket is required for case`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Notice types for administrative process
 */
export type NoticeType =
  | 'ConditionalAcceptance'
  | 'NoticeOfFault'
  | 'NoticeOfDefault'
  | 'OpportunityToCure'
  | 'AffidavitOfTruth'
  | 'CertificateOfService';

/**
 * Delivery methods for notices
 */
export type DeliveryMethod =
  | 'CertifiedMail'
  | 'Email'
  | 'Fax'
  | 'PersonalService'
  | 'AffidavitDelivery';

/**
 * Response types from recipients
 */
export type ResponseType = 'Acceptance' | 'Rebuttal' | 'CounterNotice' | 'Default';

/**
 * Notice document sent to a recipient
 */
export interface Notice {
  id: string;
  type: NoticeType;
  senderId: string;
  recipientId: string;
  recipientAddress: Address;
  subject: string;
  content: string;
  deliveryMethod: DeliveryMethod;
  sentDate: string;
  responseDeadline?: string;
  affidavitId?: string; // Link to originating affidavit
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Defaulted';
  proofOfDelivery?: ProofOfDelivery;
  response?: Response;
}

/**
 * Proof of delivery for a notice
 */
export interface ProofOfDelivery {
  method: DeliveryMethod;
  trackingNumber?: string;
  deliveryDate?: string;
  signature?: string;
  attachmentUrl?: string;
}

/**
 * Response to a notice
 */
export interface Response {
  id: string;
  noticeId: string;
  type: ResponseType;
  content: string;
  receivedDate: string;
  attachments?: string[];
}

/**
 * Timeline event in administrative process
 */
export interface TimelineEvent {
  id: string;
  processId: string;
  eventType: 'NoticeSent' | 'NoticeReceived' | 'ResponseReceived' | 'DefaultDeclared' | 'DeadlineExtended';
  timestamp: string;
  description: string;
  relatedDocuments: string[];
}

/**
 * Administrative process tracking
 */
export interface Process {
  id: string;
  title: string;
  type: 'AffidavitProcess' | 'NoticeProcess' | 'EvidenceCollection';
  affidavitId?: string;
  notices: Notice[];
  status: 'Active' | 'Completed' | 'Defaulted' | 'Closed';
  createdDate: string;
  updatedDate: string;
  timeline: TimelineEvent[];
}

/**
 * Document stored in evidence locker
 */
export interface EvidenceDocument {
  id: string;
  processId: string;
  title: string;
  type: 'Affidavit' | 'Notice' | 'Response' | 'ProofOfDelivery' | 'Exhibit';
  fileUrl: string;
  hash: string;
  uploadedDate: string;
  tags: string[];
  chainOfCustody: ChainOfCustodyEntry[];
}

/**
 * Chain of custody entry for evidence
 */
export interface ChainOfCustodyEntry {
  id: string;
  documentId: string;
  action: 'Created' | 'Viewed' | 'Modified' | 'Certified' | 'Transferred';
  actorId: string;
  actorName: string;
  timestamp: string;
  notes?: string;
}

/**
 * Calculation result for fractional reserve spread
 */
export interface SpreadCalculation {
  loanAmount: number;
  reserveRatio: number;
  fractionallyReservedAmount: number;
  spread: number;
  usuryAmount?: number;
  calculationDate: string;
  loanReferenceId: string;
}

/**
 * Administrative process template
 */
export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  steps: ProcessStep[];
  defaultDeadlines: {
    responsePeriod: number; // days
    curePeriod: number; // days
    noticePeriod: number; // days
  };
}

/**
 * Single step in a process template
 */
export interface ProcessStep {
  id: string;
  order: number;
  title: string;
  description: string;
  actionType: 'CreateAffidavit' | 'SendNotice' | 'WaitForResponse' | 'DeclareDefault';
  templateId?: string;
  required: boolean;
}

/**
 * Judicial notice package for court submission
 */
export interface JudicialNoticePackage {
  processId: string;
  affidavitIds: string[];
  exhibitList: Exhibit[];
  certificateOfService: CertificateOfService;
  declarationOfTruth: string;
  preparedDate: string;
  notarized: boolean;
}

/**
 * Exhibit for judicial notice
 */
export interface Exhibit {
  id: string;
  number: string;
  title: string;
  description: string;
  documentId: string;
  authenticated: boolean;
}

/**
 * Certificate of service for court filing
 */
export interface CertificateOfService {
  id: string;
  processId: string;
  servedUpon: string[];
  serviceDates: string[];
  methods: DeliveryMethod[];
  declarantName: string;
  declarantCapacity: string;
  declarationDate: string;
  notarized: boolean;
  notaryCommissionNumber?: string;
}

/**
 * Validate a notice object
 */
export function validateNotice(notice: Partial<Notice>): ValidationResult {
  const errors: string[] = [];

  if (!notice.id) {
    errors.push('notice.id is required');
  }

  if (!notice.senderId) {
    errors.push('notice.senderId is required');
  }

  if (!notice.recipientId) {
    errors.push('notice.recipientId is required');
  }

  if (!notice.recipientAddress) {
    errors.push('notice.recipientAddress is required');
  }

  if (!notice.content) {
    errors.push('notice.content is required');
  }

  if (!notice.deliveryMethod) {
    errors.push('notice.deliveryMethod is required');
  }

  if (!notice.sentDate) {
    errors.push('notice.sentDate is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a response object
 */
export function validateResponse(response: Partial<Response>): ValidationResult {
  const errors: string[] = [];

  if (!response.id) {
    errors.push('response.id is required');
  }

  if (!response.noticeId) {
    errors.push('response.noticeId is required');
  }

  if (!response.type) {
    errors.push('response.type is required');
  }

  if (!response.content) {
    errors.push('response.content is required');
  }

  if (!response.receivedDate) {
    errors.push('response.receivedDate is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
