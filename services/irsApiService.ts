
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

    if (fuzzConfig.enabled && !secrets.bsoUserId) {
        // Enforce secret presence if fuzzing is strict, or just warn in mock
    }

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
    await new Promise(r => setTimeout(r, 800)); // Extra processing time

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
        <efile:ReturnType>1041</efile:ReturnType>
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

  // Apply Fuzzing Logic
  if (fuzzer.shouldError()) {
      status = 'Rejected';
      const err = fuzzer.getRandomError('MeF');
      errorMsg = err.message;
  } else {
      // Default light random fail if not fuzzing hard
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

// --- CIR (Collections Information Repository) EXTRACT GENERATION ---
// Supports XML 5.0.3 schema for Digital Wallets (PayPal/Amazon)

export const generateCIRExtract = (extractType: CIRExtractType, filter: DigitalWalletFilter): string => {
    const timestamp = new Date().toISOString();
    const isPayPal = filter === 'PayPal' || filter === 'All';
    const isAmazon = filter === 'Amazon' || filter === 'All';
    
    // Header - Updated for XML 5.0.3 (Sep 29, 2022 Spec)
    // Note: Namespace updated to reflect 2022 standards if applicable, usually kept consistent in legacy systems
    let xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<CollRpt xsi:schemaLocation="urn:us:gov:treasury CollectionsReport_x.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;

    if (isPayPal) {
        xml += `
  <Sumry ID="1488229${Math.floor(Math.random() * 1000000)}" ALC="000099909" AgtRTN="121000248">
    <BnkPostDt="2014-10-06" CshFlwID="0000990909" CshFlwNm="Agency 9909">
      <ChnlTypCd="Internet" CAN="${CIR_CANS.PAYPAL}" CollBusDt="2014-10-06">
        <CollStatCd="Settled" ComlBnkInd="1" CrInd="1" IptSysTxt="PAYGOV">
          <IRS_TaxInd="0" RptPgmNm="Pay.gov" RptSbprgNm="Hosted Form (web)">
             <SttlMchsmCd="Other" RcptMchsmCd="Other">
                <!-- Vchr Element updated with 5.0.3 Attributes -->
                <Vchr ID="1" PartlInd="0" VchrFormCd="215" VchrDt="2014-10-06">
                   <VchrNr="104999" SmrzdDtlCnt="2" AgcyCmtTxt="PayPal" NonDomCollInd="0" />
                   ${extractType !== 'Summary Only' ? `
                   <!-- Detail Data -->
                   <AcctCls CrInd="1" Amt="99.00">
                      <CKey CkeyNm="Pay.gov ALC+2" CkeyVal="0000990909" />
                   </AcctCls>
                   <BT_PgmDta ID="25HRNN99" AgcyFormNr="Form Nbr" UserDtaCnt="2">
                      <UDF ID="1">CUI_Ind="0"</UDF>
                      <![CDATA[<Agency><page1><firstName>John</firstName><lastName>Doe</lastName><POC_email>john@example.com</POC_email></page1></Agency>]]>
                   </BT_PgmDta>` : ''}
                </Vchr>
             </SttlMchsmCd>
          </IRS_TaxInd>
        </CollStatCd>
      </ChnlTypCd>
    </BnkPostDt>
  </Sumry>`;
    }

    if (isAmazon) {
        xml += `
  <Sumry ID="1762106${Math.floor(Math.random() * 1000000)}" ALC="75395125" AgtRTN="121000248">
    <BnkPostDt="2016-05-12" CshFlwID="7539512506" CshFlwNm="SAT112 Simple form">
      <ChnlTypCd="Internet" CAN="${CIR_CANS.AMAZON}" CollBusDt="2016-05-12">
        <CollStatCd="Settled" ComlBnkInd="1" CrInd="1" IptSysTxt="PAYGOV">
          <IRS_TaxInd="0" RptPgmNm="Pay.gov" RptSbprgNm="Hosted Form (web)">
             <SttlMchsmCd="Other" RcptMchsmCd="Other">
                <!-- Vchr Element updated with 5.0.3 Attributes -->
                <Vchr ID="1762140" PartlInd="0" VchrFormCd="215" VchrDt="2016-05-12">
                   <VchrNr="127001" SmrzdDtlCnt="2" AgcyCmtTxt="Amazon" NonDomCollInd="0" />
                   ${extractType !== 'Summary Only' ? `
                   <!-- Detail Data -->
                   <AcctCls CrInd="1" Amt="1999.99">
                      <CKey CkeyNm="Classificat Key name" CkeyVal="Classification Key" />
                   </AcctCls>
                   <BT_PgmDta ID="24TLO4K4" AgcyFormNr="SAT112_Form_001" FormRvsnFileNm="DOI_Mustangs_v1.xdp">
                      <UDF ID="1">CUI_Ind="0"</UDF>
                      <![CDATA[<DOI_Mustangs_v1><RemittanceNetAmount>1999.99</RemittanceNetAmount><PaygovCollection/></DOI_Mustangs_v1>]]>
                   </BT_PgmDta>` : ''}
                </Vchr>
             </SttlMchsmCd>
          </IRS_TaxInd>
        </CollStatCd>
      </ChnlTypCd>
    </BnkPostDt>
  </Sumry>`;
    }

    xml += `
</CollRpt>`;
    return xml;
};

// Grounding Search Simulation
export const searchIRSManual = async (query: string): Promise<SearchResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 600)); 

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
    },
    {
      id: 'TFM-4A-4000',
      title: 'TFM Vol I, Part 4A, Ch 4000 - Requirements for Non-Treasury Disbursing Officers',
      snippet: '...policies and procedures for <strong>Delegated Disbursing Authority</strong>. Includes requirements for separation of duties and physical security.',
      source: 'IRM',
      url: 'https://tfm.fiscal.treasury.gov/v1/p4/ac400.html',
      relevance: 0.99
    }
  ];

  return DATABASE.filter(item => 
    item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
  );
};
