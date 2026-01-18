// Notice Transport Types - Formal EBNF Grammar Implementation
// Implements grammar specification in docs/notice-transport-grammar.md

/**
 * Event identifier matching EBNF: <event-identifier> ::= <event-type> "-" <timestamp> "-" <unique-id>
 */
export interface EventIdentifier {
  type: EventType;
  timestamp: string; // ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ
  uniqueId: string; // hex{32} or UUID
}

/**
 * Event types for administrative process transport
 */
export type EventType =
  | 'NOTICE'
  | 'CA' // Conditional Acceptance
  | 'NOF' // Notice of Fault
  | 'COS' // Certificate of Service
  | 'DD' // Default Declaration
  | 'CN' // Counter-Notice
  | 'RESPONSE'
  | 'DEFAULT';

/**
 * Event metadata for tracking and chain management
 */
export interface EventMetadata {
  eventId: EventIdentifier;
  eventType: EventType;
  timestamp: string;
  chainId: string;
  parentEventId: EventIdentifier | null;
  status: EventStatus;
}

/**
 * Event status through lifecycle
 */
export type EventStatus =
  | 'Draft'
  | 'Sent'
  | 'Delivered'
  | 'Accepted'
  | 'Rejected'
  | 'Defaulted'
  | 'Archived';

/**
 * Address format matching EBNF
 */
export interface Address {
  street: string;
  city: string;
  state: string; // Two-letter state code
  zipCode: string; // ZIP or ZIP+4
}

/**
 * Party information
 */
export interface Party {
  name: string;
  entity?: string;
  address?: Address;
  email?: string;
}

/**
 * Reference number format: <prefix> "-" <sequence> "-" <year>
 */
export interface ReferenceNumber {
  prefix: ReferencePrefix;
  sequence: string; // 6-digit zero-padded
  year: string; // 4-digit year
}

export type ReferencePrefix = 'NOTICE' | 'CA' | 'NOF' | 'COS' | 'DD' | 'CN' | 'RESPONSE';

/**
 * Subject line for notices
 */
export interface NoticeSubject {
  type: string;
  reference: string; // Formatted reference number
}

/**
 * Notice body structure
 */
export interface NoticeBody {
  preamble: string;
  statements: string[];
  demand?: string;
  deadline: string;
}

/**
 * Signature block
 */
export interface SignatureBlock {
  printName: string;
  title: string;
  date?: string;
  seal?: boolean;
}

// ============================================================================
// NOTICE TEMPLATE (EBNF: <notice>)
// ============================================================================

/**
 * Complete notice structure
 */
export interface NoticeTemplate {
  header: string; // "NOTICE"
  date: string; // "January 14, 2025 • 12:00 PM"
  from: Party;
  to: Party;
  subject: NoticeSubject;
  body: NoticeBody;
  signature: SignatureBlock;
}

// ============================================================================
// CONDITIONAL ACCEPTANCE TEMPLATE (EBNF: <conditional-acceptance>)
// ============================================================================

/**
 * Reference to original notice
 */
export interface NoticeReference {
  noticeType: string;
  referenceNumber: string;
  date: string;
}

/**
 * Deadline specification
 */
export interface Deadline {
  days: number;
  deadlineDate: string; // YYYY-MM-DD format
}

/**
 * Conditional acceptance structure
 */
export interface ConditionalAcceptanceTemplate {
  header: string; // "CONDITIONAL ACCEPTANCE"
  reference: NoticeReference;
  acceptanceStatement: string;
  conditions: string[];
  closingStatement: string;
  deadline: Deadline;
  signature: SignatureBlock;
}

// ============================================================================
// NOTICE OF FAULT TEMPLATE (EBNF: <notice-of-fault>)
// ============================================================================

/**
 * Reference to original notice for fault identification
 */
export interface FaultReference {
  originalNotice: string;
  servedDate: string;
}

/**
 * Cure period specification
 */
export interface CurePeriod {
  days: number;
  cureDeadline: string;
}

/**
 * Notice of fault structure
 */
export interface NoticeOfFaultTemplate {
  header: string; // "NOTICE OF FAULT AND OPPORTUNITY TO CURE"
  reference: FaultReference;
  faultIdentification: string;
  faults: string[];
  curePeriod: CurePeriod;
  signature: SignatureBlock;
}

// ============================================================================
// CERTIFICATE OF SERVICE TEMPLATE (EBNF: <certificate-of-service>)
// ============================================================================

/**
 * Delivery method types
 */
export type DeliveryMethodType = 'Certified Mail' | 'Email' | 'Hand Delivery' | 'Fax';

/**
 * Certified mail delivery details
 */
export interface CertifiedMailDelivery {
  type: 'Certified Mail';
  trackingNumber: string; // 22-digit tracking number
  recipientAddress: string;
}

/**
 * Email delivery details
 */
export interface EmailDelivery {
  type: 'Email';
  emailAddress: string;
  readReceipt: boolean;
}

/**
 * Hand delivery details
 */
export interface HandDelivery {
  type: 'Hand Delivery';
  recipientAddress: string;
  deliveredBy: string;
}

/**
 * Union type for delivery methods
 */
export type DeliveryMethod = CertifiedMailDelivery | EmailDelivery | HandDelivery;

/**
 * Recipient information for certificate
 */
export interface CertificateRecipient {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Certificate of service structure
 */
export interface CertificateOfServiceTemplate {
  header: string; // "CERTIFICATE OF SERVICE"
  certificationStatement: string;
  deliveryMethod: DeliveryMethod;
  recipient: CertificateRecipient;
  serviceDate: string; // "January 14, 2025"
  signature: SignatureBlock;
}

// ============================================================================
// RESPONSE TEMPLATE (EBNF: <response>)
// ============================================================================

/**
 * Response type enumeration
 */
export type ResponseType = 'Acceptance' | 'Rebuttal' | 'Counter-Notice' | 'Objection';

/**
 * Rebuttal point with supporting citation
 */
export interface RebuttalPoint {
  point: string;
  supportingCitation?: string;
}

/**
 * Response body variants
 */
export interface AcceptanceBody {
  acceptanceStatement: string;
  acceptanceDetails?: string;
}

export interface RebuttalBody {
  rebuttalStatement: string;
  rebuttalPoints: RebuttalPoint[];
}

export interface CounterNoticeBody {
  counterNoticeHeader: string;
  counterClaims: string;
  defectList: string[];
  demandStatement: string;
}

export type ResponseBody = AcceptanceBody | RebuttalBody | CounterNoticeBody;

/**
 * Response structure
 */
export interface ResponseTemplate {
  header: string; // "RESPONSE: [TYPE]"
  reference: NoticeReference;
  responseType: ResponseType;
  body: ResponseBody;
  signature: SignatureBlock;
}

// ============================================================================
// DEFAULT DECLARATION TEMPLATE (EBNF: <default-declaration>)
// ============================================================================

/**
 * Background information for default
 */
export interface DefaultBackground {
  reference: string;
  serviceDate: string;
  deadline: string;
}

/**
 * Notary jurat information
 */
export interface NotaryJurat {
  state: string;
  county: string;
  date: string;
  notaryName: string;
  commissionExpires: string;
}

/**
 * Default declaration structure
 */
export interface DefaultDeclarationTemplate {
  header: string; // "DECLARATION OF DEFAULT BY ACQUIESCENCE"
  background: DefaultBackground;
  defaultStatement: string;
  consequences: string[];
  affiantStatement: string;
  notaryJurat: NotaryJurat;
}

// ============================================================================
// EVENT CHAIN (EBNF: <event-chain>)
// ============================================================================

/**
 * Chain status tracking
 */
export type ChainStatus = 'Open' | 'Closed' | 'Defaulted' | 'In Litigation';

/**
 * Event chain for tracking notice-response sequences
 */
export interface EventChain {
  chainId: string;
  rootEvent: EventIdentifier;
  events: EventIdentifier[];
  status: ChainStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TRANSPORT EVENT (EBNF: <transport-event>)
// ============================================================================

/**
 * Acknowledgment status
 */
export type AckStatus = 'Accepted' | 'Rejected' | 'Pending' | 'Defaulted';

/**
 * Send event structure
 */
export interface SendEvent {
  type: 'SEND';
  eventType: EventType;
  eventId: EventIdentifier;
  recipientId: string;
  deliveryMethod: string;
  timestamp: string;
}

/**
 * Receive event structure
 */
export interface ReceiveEvent {
  type: 'RECEIVE';
  eventType: EventType;
  eventId: EventIdentifier;
  senderId: string;
  timestamp: string;
}

/**
 * Acknowledge event structure
 */
export interface AcknowledgeEvent {
  type: 'ACK';
  eventId: EventIdentifier;
  status: AckStatus;
  timestamp: string;
}

/**
 * Transport event union type
 */
export type TransportEvent = SendEvent | ReceiveEvent | AcknowledgeEvent;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Generate unique event identifier
 * @param eventType The type of event
 * @returns EventIdentifier with generated timestamp and unique ID
 */
export function createEventId(eventType: EventType): EventIdentifier {
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const uniqueId = generateUniqueId();
  return {
    type: eventType,
    timestamp,
    uniqueId
  };
}

/**
 * Generate event metadata
 * @param eventType The type of event
 * @param chainId The chain identifier
 * @param parentEventId Optional parent event identifier
 * @returns EventMetadata with default status
 */
export function createEventMetadata(
  eventType: EventType,
  chainId: string,
  parentEventId?: EventIdentifier
): EventMetadata {
  const eventId = createEventId(eventType);
  return {
    eventId,
    eventType,
    timestamp: eventId.timestamp,
    chainId,
    parentEventId: parentEventId ?? null,
    status: 'Draft'
  };
}

/**
 * Create send transport event
 * @param eventId The event identifier to send
 * @param recipientId The recipient identifier
 * @param deliveryMethod The delivery method
 * @returns SendEvent with timestamp
 */
export function createSendEvent(
  eventId: EventIdentifier,
  recipientId: string,
  deliveryMethod: string
): SendEvent {
  return {
    type: 'SEND',
    eventType: eventId.type,
    eventId,
    recipientId,
    deliveryMethod,
    timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  };
}

/**
 * Generate chain ID
 * @returns Chain identifier
 */
export function generateChainId(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `CHAIN-${date}-${sequence}`;
}

/**
 * Generate reference number
 * @param prefix The reference prefix
 * @returns Formatted reference number
 */
export function generateReferenceNumber(prefix: ReferencePrefix): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const sequence = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `${prefix}-${sequence}-${year}`;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate event identifier format
 * @param id The event identifier to validate
 * @returns True if valid
 */
export function validateEventId(id: EventIdentifier): boolean {
  // Validate timestamp format (ISO 8601)
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!timestampRegex.test(id.timestamp)) {
    return false;
  }

  // Validate unique ID (32 hex chars or UUID)
  const uniqueIdRegex = /^[a-f0-9]{32}$|^[a-f0-9-]{36}$/;
  if (!uniqueIdRegex.test(id.uniqueId)) {
    return false;
  }

  // Validate event type
  const validTypes: EventType[] = ['NOTICE', 'CA', 'NOF', 'COS', 'DD', 'CN', 'RESPONSE', 'DEFAULT'];
  if (!validTypes.includes(id.type)) {
    return false;
  }

  return true;
}

/**
 * Validate event chain structure
 * @param chain The event chain to validate
 * @returns True if valid
 */
export function validateEventChain(chain: EventChain): boolean {
  // Must have at least root event
  if (chain.events.length === 0) {
    return false;
  }

  // Root event must be first event
  if (chain.events[0].type !== chain.rootEvent.type) {
    return false;
  }

  // Validate timestamps
  const createdAt = new Date(chain.createdAt);
  const updatedAt = new Date(chain.updatedAt);
  if (updatedAt < createdAt) {
    return false;
  }

  return true;
}

/**
 * Validate certificate of service tracking number
 * @param trackingNumber The tracking number to validate
 * @returns True if valid format
 */
export function validateTrackingNumber(trackingNumber: string): boolean {
  // USPS Certified Mail: 22 digits starting with specific prefixes
  return /^\d{22}$/.test(trackingNumber);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate deadline from service date
 * @param serviceDate The service date (YYYY-MM-DD)
 * @param days Number of days to add
 * @returns Deadline date (YYYY-MM-DD)
 */
export function calculateDeadline(serviceDate: string, days: number): string {
  const date = new Date(serviceDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Format date for notice display
 * @param date The date to format
 * @returns Formatted date string (e.g., "January 14, 2025")
 */
export function formatNoticeDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format date and time for notice display
 * @param date The date to format
 * @returns Formatted date/time string (e.g., "January 14, 2025 • 12:00 PM")
 */
export function formatNoticeDateTime(date: Date): string {
  const datePart = formatNoticeDate(date);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${datePart} • ${displayHours}:${minutes} ${ampm}`;
}

/**
 * Generate unique ID (32 hex characters)
 * @returns Hex string
 */
function generateUniqueId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Check if event chain is in default status
 * @param chain The event chain to check
 * @returns True if defaulted
 */
export function isDefaulted(chain: EventChain): boolean {
  return chain.status === 'Defaulted';
}

/**
 * Check if deadline has passed
 * @param deadline The deadline date (YYYY-MM-DD)
 * @returns True if deadline has passed
 */
export function isDeadlinePassed(deadline: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

/**
 * Get days until deadline
 * @param deadline The deadline date (YYYY-MM-DD)
 * @returns Number of days (negative if passed)
 */
export function getDaysUntilDeadline(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diff = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
