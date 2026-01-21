
import { v4 as uuidv4 } from 'uuid';
import { ApiChannel, TransmissionLog, SystemStatus, SearchResult, IRSFormType, Entity, ApiSecrets, FuzzConfig, TransmissionStatus, CIRExtractType, DigitalWalletFilter, CIR_CANS } from '../types';
import { api } from './apiProxy';
import { formatEINOrPending } from '../utils/formatters';
import { IRIS_API_SPEC } from './openApiDefinitions';

// --- FUZZER ENGINE ---

class ProtocolFuzzer {
  constructor(private config: FuzzConfig) { }

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

const generateMockXML = (entity: Entity, formType: string) => {
  const timestamp = new Date().toISOString();

  // Custom Vertex AI Network Socket Header Simulation
  const socketHeader = `<!-- Vertex Network Socket: v4.2.1 | Latency: 12ms | Compression: GZIP -->`;

  if (formType === 'CAFR') {
    return `${socketHeader}
<CAFR:Report xmlns:CAFR="http://www.gov.uk/cafr/v1">
    <Header>
        <EntityID>${entity.id}</EntityID>
        <ReportPeriod>2024</ReportPeriod>
        <Standards>GASB</Standards>
    </Header>
    <Financials>
        <TotalAssets>45000000</TotalAssets>
        <Liabilities>12000000</Liabilities>
        <NetPosition>33000000</NetPosition>
    </Financials>
    <Signatures>
        <Auditor>Independent Firm LLC</Auditor>
        <Controller>${entity.name}</Controller>
    </Signatures>
</CAFR:Report>`;
  }

  if (formType === '1042') {
    return `${socketHeader}
<IRIS:Form1042 xmlns:IRIS="http://www.irs.gov/iris/v1">
    <WithholdingAgent>
        <EIN>${formatEINOrPending(entity.einLast4)}</EIN>
        <Name>${entity.name}</Name>
        <Chapter3Status>Withholding Foreign Partnership</Chapter3Status>
    </WithholdingAgent>
    <Totals>
        <GrossIncome>150000.00</GrossIncome>
        <TaxWithheld>45000.00</TaxWithheld>
    </Totals>
</IRIS:Form1042>`;
  }

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
      <efile:EIN>${formatEINOrPending(entity.einLast4)}</efile:EIN>
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
  formType: string,
  fuzzConfig: FuzzConfig
): Promise<TransmissionLog> => {
  const fuzzer = new ProtocolFuzzer(fuzzConfig);
  await fuzzer.injectLatency();

  const channel: ApiChannel = formType === 'CAFR' || formType === '1042' || formType.startsWith('1099') ? 'IRIS' : formType === '1041' || formType === '941' ? 'MeF' : 'IRIS';

  const idVal = uuidv4() || '';
  const submissionId = idVal.replace(/-/g, '').substring(0, 20);

  const payload = generateMockXML(entity, formType);

  let status: 'Accepted' | 'Rejected' = 'Accepted';
  let errorMsg = '';
  let ackPayload = '';

  if (channel === 'IRIS') {
    try {
      const apiResponse = await api.request(
        IRIS_API_SPEC,
        '/v1/submissions',
        'post',
        {
          transmitterId: 'TCC-GENAI-01',
          softwareId: 'TRUST-LEDGER-V1',
          formType,
          filer: {
            ein: entity.einLast4 ? `XX-XXX${entity.einLast4}` : 'PENDING',
            name: entity.name
          }
        }
      );

      // Use AI decision from proxy
      status = apiResponse.status === 'Accepted' || apiResponse.status === 'Processing' ? 'Accepted' : 'Rejected';
      ackPayload = JSON.stringify(apiResponse, null, 2);

      if (status === 'Rejected') errorMsg = apiResponse.messages?.[0] || 'Unknown API Error';

    } catch (e: any) {
      status = 'Rejected';
      errorMsg = e.message;
      ackPayload = JSON.stringify({ error: e.message });
    }
  } else {
    // Existing MeF Logic (Mock)
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
    ackPayload = generateAckXML(submissionId, status, errorMsg);
  }

  // Handle potential JSON parsing error for ID extraction
  let finalSubId = submissionId;
  if (channel === 'IRIS') {
    try {
      const jsonAck = JSON.parse(ackPayload);
      if (jsonAck.receiptId) finalSubId = jsonAck.receiptId;
    } catch (e) { }
  }

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    channel,
    formType,
    entityId: entity.id,
    status: status as TransmissionStatus,
    submissionId: finalSubId,
    xmlPayload: payload,
    ackPayload,
    latencyMs: fuzzConfig.latencyMode === 'Laggy' ? 3500 : 120
  };
};

export const generateCIRExtract = (extractType: CIRExtractType, filter: DigitalWalletFilter): string => {
  const timestamp = new Date().toISOString();
  const isPayPal = filter === 'PayPal' || filter === 'All';

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

  // STUB: Validated via Google Search Integration
  const DATABASE: SearchResult[] = [];

  // If no AI search available, return a helpful stub suggesting Google
  return [
    {
      id: 'GOOGLE-SEARCH',
      title: `Search Google for "${query}"`,
      snippet: 'Click to perform an external search for this term on the open web.',
      source: 'Pub',
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}+site:irs.gov`,
      relevance: 1.0
    }
  ];

  return DATABASE.filter(item =>
    item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
  );
};
