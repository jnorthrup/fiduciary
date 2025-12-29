
import { v4 as uuidv4 } from 'uuid';
import { ApiChannel, TransmissionLog, SystemStatus, SearchResult, IRSFormType, Entity, ApiSecrets, FuzzConfig, TransmissionStatus, CIRExtractType, DigitalWalletFilter, CIR_CANS } from '../types';

// --- FUZZER ENGINE ---

class ProtocolFuzzer {
    constructor(private config: FuzzConfig) {}

    shouldError(): boolean {
        if (!this.config.enabled) return false;
        const threshold = this.config.intensity === 'High' ? 0.6 : this.config.intensity === 'Medium' ? 0.3 : 0.1;
        return Math.random() < threshold;
    }

    async injectLatency(): Promise<void> {
        let ms = 100; // Fast
        if (this.config.latencyMode === 'Realistic') ms = Math.floor(Math.random() * 1500) + 500; // 0.5s - 2s
        if (this.config.latencyMode === 'Laggy') ms = Math.floor(Math.random() * 4000) + 2000; // 2s - 6s
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    getRandomError(context: 'MeF' | 'BSO'): Error {
        const errors = context === 'MeF' ? [
            "T0000: Schema Validation Error - Invalid XML Structure",
            "R0000-900: System Error - Backend Database Timeout",
            "E0001: Authentication Failed - ETIN/AppID Mismatch",
            "X0000: Transmission Interrupted",
            "R0000-504: Gateway Time-out"
        ] : [
            "BSO-900: Handshake Failed - Invalid Credentials",
            "BSO-101: Session Expired",
            "BSO-500: Internal Server Error - Wage Reporting Service Unavailable",
            "BSO-403: Unauthorized - EFW2 Format Invalid"
        ];
        return new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
}

// --- MOCK BSO PROTOCOL ---

export const mockBSORegistration = async (userId: string, secrets: ApiSecrets, fuzzConfig: FuzzConfig) => {
    const fuzzer = new ProtocolFuzzer(fuzzConfig);
    await fuzzer.injectLatency();

    if (fuzzer.shouldError()) {
        throw fuzzer.getRandomError('BSO');
    }

    return { status: 'Registered', timestamp: new Date().toISOString() };
};

export const mockBSOSubmission = async (bsoId: string, secrets: ApiSecrets, fuzzConfig: FuzzConfig) => {
    const fuzzer = new ProtocolFuzzer(fuzzConfig);
    await fuzzer.injectLatency();

    if (fuzzer.shouldError()) {
        throw fuzzer.getRandomError('BSO');
    }

    // Simulate AccuWage check
    await new Promise(r => setTimeout(r, 800)); 

    return { 
        status: Math.random() > 0.1 ? 'AccuWage-Pass' : 'AccuWage-Errors', 
        batchId: `BATCH_${new Date().getFullYear()}_${Math.floor(Math.random() * 1000)}` 
    };
};

// --- MOCK MeF PROTOCOL ---

export const getSystemStatus = (): SystemStatus[] => [
  { channel: 'MeF', status: 'Operational', latency: '45ms', uptime: '99.98%' },
  { channel: 'AIR', status: 'Operational', latency: '120ms', uptime: '99.5%' },
  { channel: 'IRIS', status: 'Degraded', latency: '800ms', uptime: '98.2%' },
  { channel: 'FEDWIRE', status: 'Operational', latency: '12ms', uptime: '99.99%' },
  { channel: 'FEDNOW', status: 'Operational', latency: '3ms', uptime: '99.99%' },
  { channel: 'TIN_MATCH', status: 'Maintenance', latency: '-', uptime: '0%' },
];

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
        <efile:ReturnType>Institutional</efile:ReturnType>
        <efile:Filer>
          <efile:Name>${entity.name}</efile:Name>
        </efile:Filer>
      </efile:ReturnHeader>
    </efile:ReturnData>
  </SOAP:Body>
</SOAP:Envelope>`;
};

const generateAckXML = (submissionId: string, status: 'Accepted' | 'Rejected', errorMsg?: string) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<efile:Acknowledgement>
  <efile:SubmissionId>${submissionId}</efile:SubmissionId>
  <efile:Status>${status}</efile:Status>
  <efile:AcceptanceDate>${new Date().toISOString()}</efile:AcceptanceDate>
  ${status === 'Rejected' ? `<efile:Errors><efile:Error><Code>R0000-900</Code><Message>${errorMsg || 'Unknown Error'}</Message></efile:Error></efile:Errors>` : ''}
</efile:Acknowledgement>`;
};

// Main Simulation Function
export const simulateTransmission = async (
  entity: Entity, 
  formType: IRSFormType,
  fuzzConfig: FuzzConfig
): Promise<TransmissionLog> => {
  const fuzzer = new ProtocolFuzzer(fuzzConfig);
  await fuzzer.injectLatency();

  const channel: ApiChannel = formType === '1041' || formType === '941' ? 'MeF' : 'IRIS';
  const submissionId = uuidv4().replace(/-/g, '').substring(0, 20);
  const payload = generateMockXML(entity, formType);
  
  let status: 'Accepted' | 'Rejected' = 'Accepted';
  let errorMsg = '';

  if (fuzzer.shouldError()) {
      status = 'Rejected';
      const err = fuzzer.getRandomError('MeF');
      errorMsg = err.message;
  } else {
      const isSuccess = Math.random() > 0.05; 
      if (!isSuccess) {
          status = 'Rejected';
          errorMsg = "Schema Validation Failed: Element 'EIN' is invalid.";
      }
  }

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    channel,
    formType,
    entityId: entity.id,
    status: status as TransmissionStatus,
    submissionId,
    xmlPayload: payload,
    ackPayload: generateAckXML(submissionId, status, errorMsg),
    latencyMs: fuzzConfig.latencyMode === 'Laggy' ? 3500 : 120
  };
};

export const generateCIRExtract = (extractType: CIRExtractType, filter: DigitalWalletFilter): string => {
    const timestamp = new Date().toISOString();
    const isPayPal = filter === 'PayPal' || filter === 'All';
    const isAmazon = filter === 'Amazon' || filter === 'All';
    
    let xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<CollRpt xsi:schemaLocation="urn:us:gov:treasury CollectionsReport_x.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;

    if (isPayPal) {
        xml += `
  <Sumry ID="P-${Math.floor(Math.random() * 1000000)}" ALC="000099909" AgtRTN="121000248">
    <BnkPostDt="${timestamp}" CshFlwNm="Institutional Clearing">
      <ChnlTypCd="Internet" CAN="${CIR_CANS.PAYPAL}">
        <CollStatCd="Settled">
          <Vchr ID="1" VchrFormCd="215">
             <VchrNr="104999" AgcyCmtTxt="PayPal Settlement" />
             ${extractType !== 'Summary Only' ? `
             <AcctCls CrInd="1" Amt="99.00">
                <CKey CkeyNm="Institutional ID" CkeyVal="SOV-001" />
             </AcctCls>` : ''}
          </Vchr>
        </CollStatCd>
      </ChnlTypCd>
    </BnkPostDt>
  </Sumry>`;
    }

    xml += `
</CollRpt>`;
    return xml;
};

export const searchIRSManual = async (query: string): Promise<SearchResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 600)); 

  if (!query) return [];

  const q = query.toLowerCase();
  
  const DATABASE: SearchResult[] = [
    {
      id: 'IRM-3.8.45',
      title: 'IRM 3.8.45 - Manual Deposit Process',
      snippet: 'Official instructions for processing manual institutional deposits.',
      source: 'IRM',
      url: 'https://www.irs.gov/irm/part3/irm_03-008-045r',
      relevance: 0.95
    },
    {
      id: 'TFM-4A-4000',
      title: 'TFM Vol I, Part 4A, Ch 4000 - Non-Treasury Disbursing Officers',
      snippet: 'Policies and procedures for delegated institutional disbursing authority.',
      source: 'IRM',
      url: 'https://tfm.fiscal.treasury.gov/v1/p4/ac400.html',
      relevance: 0.99
    }
  ];

  return DATABASE.filter(item => 
    item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
  );
};
