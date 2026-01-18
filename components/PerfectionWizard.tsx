
import React from 'react';
import { PerfectionInstruction } from '../types';
import { Mail, ShieldCheck, MapPin, Send, CheckCircle2, Printer, Package } from 'lucide-react';
import { useSimpleWizard } from '../hooks';
import { 
  WizardContainer, 
  WizardNavigation, 
  InfoBanner, 
  FormField, 
  SelectionGrid 
} from './shared/WizardComponents';

interface Props {
  filingId: string;
  onComplete: (instruction: PerfectionInstruction) => void;
}

// Form data type
interface PerfectionFormData {
  method: PerfectionInstruction['method'];
  name: string;
  address: string;
}

const DELIVERY_OPTIONS = [
  { id: '1st Class Mail' as const, label: '1st Class Mail', icon: <Mail size={24} /> },
  { id: 'Certified Return Receipt' as const, label: 'Certified Return Receipt', icon: <ShieldCheck size={24} /> },
  { id: 'Private Courier' as const, label: 'Private Courier', icon: <Package size={24} /> },
];

export const PerfectionWizard: React.FC<Props> = ({ filingId, onComplete }) => {
  const { step, setStep, isLoading, withLoading } = useSimpleWizard(2);
  
  const [formData, setFormData] = React.useState<PerfectionFormData>({
    method: 'Certified Return Receipt',
    name: '',
    address: '',
  });

  const canExecute = formData.name.trim() && formData.address.trim();

  const handleExecute = async () => {
    await withLoading(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onComplete({
        id: `PRX-${Date.now()}`,
        filingId,
        method: formData.method,
        recipientName: formData.name,
        address: formData.address,
        isPerfected: true,
        perfectionDate: new Date().toISOString().split('T')[0],
        trackingNumber: `7021-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
      });
      
      setStep(2);
    });
  };

  return (
    <WizardContainer
      title="1st Class Delivery Perfection"
      subtitle="Constructive Notice • Actual Notice • Procedural Evidence"
      icon={<Mail className="h-6 w-6 text-indigo-600" />}
    >
      {step === 1 && (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in">
          <InfoBanner title="Doctrine of Notice">
            "Delivery is the perfection of the act." Select the method of service 
            to establish jurisdictional proof of notice.
          </InfoBanner>

          <FormField label="Delivery Method">
            <SelectionGrid
              value={formData.method}
              onChange={(method) => setFormData(prev => ({ ...prev, method }))}
              options={DELIVERY_OPTIONS}
              columns={3}
            />
          </FormField>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <FormField label="Party of Interest (Recipient)">
              <input 
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Legal Name or Registered Agent"
              />
            </FormField>

            <FormField label="Place of Abode / Registered Address">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                <MapPin size={12} />
              </div>
              <textarea 
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                placeholder="Full Mailing Address..."
              />
            </FormField>
          </div>

          <WizardNavigation
            onComplete={handleExecute}
            canGoNext={canExecute}
            isLoading={isLoading}
            isLastStep={true}
            completeLabel="Execute Perfection Instructions"
          />
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95">
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full w-fit border border-emerald-200 text-sm font-bold mx-auto">
            <CheckCircle2 size={16} /> Service Perfection Proof Generated
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold tracking-widest uppercase text-sm">Certificate of Service</h3>
              <Printer size={18} className="opacity-50" />
            </div>
            
            <div className="p-8 space-y-6 font-serif text-sm leading-relaxed text-slate-900">
              <div className="text-center font-bold underline mb-8">AFFIDAVIT OF DELIVERY PERFECTION</div>
              <p>
                I, the undersigned, hereby certify that on this date, I have caused to be delivered 
                by <strong>{formData.method.toUpperCase()}</strong>, a true and correct copy of the 
                Chancery Filing #{filingId.slice(-6)} to the following party:
              </p>
              <div className="bg-white border p-4 rounded italic">
                {formData.name}<br/>
                {formData.address}
              </div>
              <p>
                Such delivery constitutes <strong>PERFECTION OF NOTICE</strong> under the rules of 
                Equity and provides conclusive evidence of service upon the Res.
              </p>
              <div className="pt-12 flex justify-between text-[10px] font-sans font-bold uppercase text-slate-500">
                <span>Date: {new Date().toLocaleDateString()}</span>
                <span className="text-indigo-600">Verified Procedural Act</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setStep(1)}
            className="w-full py-3 text-slate-500 hover:text-slate-800 font-bold"
          >
            Initiate New Perfection
          </button>
        </div>
      )}
    </WizardContainer>
  );
};
