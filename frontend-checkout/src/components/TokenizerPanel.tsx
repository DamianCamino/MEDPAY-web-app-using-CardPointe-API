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
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Account Type</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand outline-none transition-all"
            value={accountType}
            onChange={(e) => onAccountTypeChange(e.target.value as 'ECHK' | 'ESAV')}
          >
            <option value="ECHK">Checking</option>
            <option value="ESAV">Savings</option>
          </select>
          <p className="text-xs text-gray-400 mt-2">
            Enter your account in the field below as{' '}
            <strong>RoutingNumber/AccountNumber</strong> (e.g. 022000046/1234567890).
          </p>
        </div>
      )}

      {/*
        Contenedor "tipo tarjeta" con mas padding y un label destacado arriba,
        para que visualmente se acerque a tener "Card Number" / "Expiration
        Date" / "CVV" como campos propios, aunque en realidad todo vive
        dentro del mismo iframe seguro de CardPointe.
      */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {method === 'card' ? 'Card Number, Expiration Date & CVV' : 'Bank Account'}
        </label>
        <iframe
          ref={iframeRef}
          title="Secure payment entry"
          src={tokenizerUrl ?? undefined}
          className="w-full border-0 bg-white"
          style={{ height: method === 'card' ? 220 : 100 }}
          frameBorder={0}
          scrolling="no"
        />
        <div className={`text-xs mt-2 ${ready ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
          {ready ? 'Details captured securely ✓' : 'Waiting for details…'}
        </div>
      </div>
    </div>
  );
}
