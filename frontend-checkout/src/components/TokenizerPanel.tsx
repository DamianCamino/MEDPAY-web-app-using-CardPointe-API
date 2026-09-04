import { useEffect, useRef, useState } from 'react';
import { parseTokenMessage } from '../protocol';

interface Props {
  method: 'card' | 'bank';
  locationId?: string;
  publishableKey?: string;
  accountType: 'ECHK' | 'ESAV';
  onAccountTypeChange: (v: 'ECHK' | 'ESAV') => void;
  onToken: (token: string, expiry?: string) => void;
}

const ACCOUNT_OPTIONS: { value: 'ECHK' | 'ESAV'; label: string }[] = [
  { value: 'ECHK', label: 'Checking' },
  { value: 'ESAV', label: 'Savings' },
];

/** Custom headless dropdown — local UI state only; outer accountType logic is untouched. */
function AccountTypeDropdown({
  accountType,
  onAccountTypeChange,
}: {
  accountType: 'ECHK' | 'ESAV';
  onAccountTypeChange: (v: 'ECHK' | 'ESAV') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const activeOption = ACCOUNT_OPTIONS.find((o) => o.value === accountType) || ACCOUNT_OPTIONS[0];

  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        Account Type
      </label>

      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between p-3 border rounded-xl text-sm cursor-pointer transition-all duration-200 ${
            isOpen
              ? 'bg-white border-brand ring-2 ring-brand/20 shadow-sm'
              : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-100/50'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2.5">
            <span className="font-medium text-gray-900">{activeOption.label}</span>
          </span>

          {/* Chevron — rotates 180° */}
          <svg
            className={`h-4 w-4 text-gray-400 transform transition-transform duration-300 ease-out ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Options menu — always mounted, animated via CSS */}
        <div
          className={`absolute left-0 right-0 mt-1.5 bg-white border border-gray-200/80 rounded-xl shadow-lg overflow-hidden origin-top transition-all duration-200 ease-out ${
            isOpen
              ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto z-50'
              : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none z-50'
          }`}
          role="listbox"
          aria-activedescendant={accountType}
        >
          {ACCOUNT_OPTIONS.map((option) => {
            const isActive = accountType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                id={option.value}
                onClick={() => {
                  onAccountTypeChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand/5 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={isActive ? 'font-semibold' : 'font-medium'}>{option.label}</span>
                </span>

                {/* Checkmark for active option */}
                {isActive && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
        Enter your account in the field below as{' '}
        <strong className="text-gray-500">RoutingNumber/AccountNumber</strong> (e.g. 022000046/1234567890).
      </p>
    </div>
  );
}

/**
 * Ambos metodos de pago (tarjeta y ACH) se capturan con el MISMO Hosted
 * iFrame Tokenizer de CardPointe — nunca con <input> propios. El PAN o el
 * routing/account nunca tocan el DOM de esta app ni llegan a nuestro backend;
 * solo llega el token que CardPointe emite via postMessage.
 *
 * El iframe es UNO SOLO (CardPointe renderiza sus propios campos internos de
 * numero/expiracion/cvv dentro de ese iframe — no son <input> nuestros). Para
 * que se vea como "Card Number" / "Expiration Date" / "CVV" en cajas
 * separadas (como el diseno de referencia), le pasamos una hoja de estilos
 * propia via el parametro `css` del tokenizer, que CardPointe aplica DENTRO
 * del iframe. Ver public/tokenizer.css.
 *
 * NOTA: los selectores exactos de los campos internos de CardPointe (ids/
 * clases) pueden variar segun la version del tokenizer. Si al probarlo los
 * campos no se separan como se espera, hay que inspeccionar el iframe
 * (boton derecho -> Inspeccionar, dentro del iframe) para confirmar los ids
 * reales y ajustar `public/tokenizer.css` en consecuencia.
 */
export function TokenizerPanel({
  method,
  locationId,
  publishableKey,
  accountType,
  onAccountTypeChange,
  onToken,
}: Props) {
  const [tokenizerUrl, setTokenizerUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setReady(false);
    const qs = new URLSearchParams();
    if (locationId) qs.set('locationId', locationId);
    if (publishableKey) qs.set('publishableKey', publishableKey);
    qs.set('method', method);

    fetch(`/checkout/config?${qs}`)
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg.tokenizerUrl) {
          setTokenizerUrl(null);
          return;
        }
        // Agregamos nuestra hoja de estilos propia para separar los campos
        // internos del tokenizer (numero / expiracion / cvv) con mas espacio
        // y claridad, en vez del layout compacto por defecto.
        const cssUrl = `${window.location.origin}/checkout/tokenizer.css`;
        const separator = cfg.tokenizerUrl.includes('?') ? '&' : '?';
        setTokenizerUrl(`${cfg.tokenizerUrl}${separator}css=${encodeURIComponent(cssUrl)}`);
      })
      .catch(() => setTokenizerUrl(null));
  }, [method, locationId, publishableKey]);

  useEffect(() => {
    function handler(event: MessageEvent) {
      if (typeof event.data !== 'string') return;
      let tokenizerEvent: any;
      try {
        tokenizerEvent = JSON.parse(event.data);
      } catch {
        return;
      }
      if (tokenizerEvent.message == null) return;

      const parsed = parseTokenMessage(tokenizerEvent.message);
      if (parsed?.token) {
        setReady(true);
        onToken(parsed.token, parsed.expiry);
      }
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onToken]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {method === 'bank' && (
        <AccountTypeDropdown
          accountType={accountType}
          onAccountTypeChange={onAccountTypeChange}
        />
      )}

      {/*
        Contenedor "tipo tarjeta" con mas padding y un label destacado arriba,
        para que visualmente se acerque a tener "Card Number" / "Expiration
        Date" / "CVV" como campos propios, aunque en realidad todo vive
        dentro del mismo iframe seguro de CardPointe.
      */}
      <div className="border border-gray-200/60 rounded-xl p-4 bg-white shadow-sm">
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          {method === 'card' ? 'Card Number, Expiration Date & CVV' : 'Bank Account'}
        </label>
        <iframe
          ref={iframeRef}
          title="Secure payment entry"
          src={tokenizerUrl ?? undefined}
          className="w-full border-0 bg-white rounded-lg"
          style={{ height: method === 'card' ? 220 : 100 }}
          frameBorder={0}
          scrolling="no"
        />
        <div className={`flex items-center gap-1.5 text-[11px] mt-2.5 transition-colors duration-300 ${ready ? 'text-green-600 font-medium' : 'text-gray-300'}`}>
          {ready ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
          )}
          <span>{ready ? 'Details captured securely' : 'Waiting for details…'}</span>
        </div>
      </div>
    </div>
  );
}
