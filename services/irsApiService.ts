import { v4 as uuidv4 } from 'uuid';
import { ApiChannel, TransmissionLog, SystemStatus, SearchResult, IRSFormType, Entity } from '../types';

// Mock System Status
export const getSystemStatus = (): SystemStatus[] => [
  { channel: 'MeF', status: 'Operational', latency: '45ms', uptime: '99.98%' },
  { channel: 'AIR', status: 'Operational', latency: '120ms', uptime: '99.5%' },
  { channel: 'IRIS', status: 'Degraded', latency: '800ms', uptime: '98.2%' },
  { channel: 'TIN_MATCH', status: 'Maintenance', latency: '-', uptime: '0%' },
];

// Mock XML Generator
const generateMockXML = (entity: Entity, formType: IRSFormType) => {
  const timestamp = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/" xmlns:efile="http://www.irs.gov/efile">
  <SOAP:Header>
    <efile:TransmissionHeader>
      <efile:TransmissionId>${uuidv4()}</efile:TransmissionId>
      <efile:Timestamp>${timestamp}</efile:Timestamp>
      <efile:Transmitter>
        <efile:ETIN>00000</efile:ETIN>
      </efile:Transmitter>
    </efile:TransmissionHeader>
  </SOAP:Header>
  <SOAP:Body>
    <efile:ReturnData>
      <efile:EntityId>${entity.id}</efile:EntityId>
      <efile:EIN>${entity.einLast4 ? 'XX-XXX' + entity.einLast4 : 'PENDING'}</efile:EIN>
      <efile:FormType>${formType}</efile:FormType>
      <efile:TaxYear>2025</efile:TaxYear>
      <efile:ReturnHeader>
        <efile:ReturnType>1041</efile:ReturnType>
        <efile:Filer>
          <efile:Name>${entity.name}</efile:Name>
        </efile:Filer>
      </efile:ReturnHeader>
    </efile:ReturnData>
  </SOAP:Body>
</SOAP:Envelope>`;
};

const generateAckXML = (submissionId: string, status: 'Accepted' | 'Rejected') => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<efile:Acknowledgement>
  <efile:SubmissionId>${submissionId}</efile:SubmissionId>
  <efile:Status>${status}</efile:Status>
  <efile:AcceptanceDate>${new Date().toISOString()}</efile:AcceptanceDate>
  ${status === 'Rejected' ? '<efile:Errors><efile:Error><Code>R0000-900</Code><Message>Schema Validation Failed: Element "EIN" is invalid.</Message></efile:Error></efile:Errors>' : ''}
</efile:Acknowledgement>`;
};

// Simulation Function
export const simulateTransmission = async (
  entity: Entity, 
  formType: IRSFormType
): Promise<TransmissionLog> => {
  const channel: ApiChannel = formType === '1041' || formType === '941' ? 'MeF' : 'IRIS';
  const submissionId = uuidv4().replace(/-/g, '').substring(0, 20); // Simulating MeF ID format
  
  // 1. Initial Queued State
  const payload = generateMockXML(entity, formType);
  const latency = Math.floor(Math.random() * 2000) + 500; // 500ms - 2500ms

  // Simulate Network Delay
  await new Promise(resolve => setTimeout(resolve, latency));

  // Random Success/Fail (90% success)
  const isSuccess = Math.random() > 0.1;
  const status = isSuccess ? 'Accepted' : 'Rejected';

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    channel,
    formType,
    entityId: entity.id,
    status,
    submissionId,
    xmlPayload: payload,
    ackPayload: generateAckXML(submissionId, status),
    latencyMs: latency
  };
};

// Grounding Search Simulation
export const searchIRSManual = async (query: string): Promise<SearchResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate search latency

  if (!query) return [];

  const q = query.toLowerCase();
  
  const DATABASE: SearchResult[] = [
    {
      id: 'IRM-3.8.45',
      title: 'IRM 3.8.45 - Manual Deposit Process',
      snippet: '...instructions for processing manual deposits. <strong>Separation of Duties</strong> is required for remittance perfection technicians.',
      source: 'IRM',
      url: 'https://www.irs.gov/irm/part3/irm_03-008-045r',
      relevance: 0.95
    },
    {
      id: 'IRM-21.3.7',
      title: 'IRM 21.3.7 - Processing Third Party Authorizations',
      snippet: '...guidance on Form 2848 and Form 8821. <strong>Centralized Authorization File (CAF)</strong> integration requirements.',
      source: 'IRM',
      url: 'https://www.irs.gov/irm/part21/irm_21-003-007r',
      relevance: 0.90
    },
    {
      id: 'PUB-1220',
      title: 'Pub 1220 - Specifications for Filing Forms 1097, 1098, 1099',
      snippet: '...electronic filing requirements for Information Returns via the <strong>FIRE System</strong> or <strong>IRIS</strong>.',
      source: 'Pub',
      url: 'https://www.irs.gov/pub/irs-pdf/p1220.pdf',
      relevance: 0.85
    },
    {
      id: 'IRM-5.11.2',
      title: 'IRM 5.11.2 - Serving Levies',
      snippet: '...procedures for issuing Form 668-W. <strong>Garnishment</strong> calculations and exempt amount tables.',
      source: 'IRM',
      url: 'https://www.irs.gov/irm/part5/irm_05-011-002',
      relevance: 0.80
    }
  ];

  return DATABASE.filter(item => 
    item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
  );
};