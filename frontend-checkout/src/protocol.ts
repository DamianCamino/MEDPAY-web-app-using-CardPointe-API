export type PaymentMethod = 'card' | 'bank' | 'alphaeon';

export interface Contact {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  /** AVS billing ZIP/postal code. May arrive from GHL contact data, or be entered manually at checkout. */
  postalCode?: string;
}

export interface PaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  transactionId?: string;
  locationId?: string;
  publishableKey?: string;
  contact?: Contact;
  mode?: string;
}

/** Mensajes salientes hacia el parent frame (GHL custom payment provider). */
export function postToParent(payload: Record<string, unknown>) {
  // Send both object and stringified forms to parent/top — GHL is inconsistent
  // about which frame/format it listens to (same class of issues as ready handshake).
  const asString = JSON.stringify(payload);
  const targets = [window.parent, window.top].filter(
    (w, i, arr) => w && w !== window && arr.indexOf(w) === i
  );
  for (const target of targets) {
    try {
      target.postMessage(payload, '*');
      target.postMessage(asString, '*');
    } catch {
      // ignore cross-origin postMessage errors
    }
  }
}
function postReadySignal(payload: Record<string, unknown>) {
  const message = JSON.stringify(payload);
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
  if (window.top && window.top !== window.parent) {
    window.top.postMessage(message, '*');
  }
}

/** GHL handshake: retry until props arrive. */
export function startReadyHandshake(shouldStop: () => boolean) {
  const payload = {
    type: 'custom_provider_ready',
    loaded: true,
    addCardOnFileSupported: false,
  };

  let attempts = 0;
  const tick = () => {
    if (shouldStop() || attempts >= 30) return;
    postReadySignal(payload);
    attempts += 1;
  };

  tick();
  const intervalId = window.setInterval(tick, 500);
  return () => clearInterval(intervalId);
}

export function normalizeCurrency(value?: string) {
  const raw = (value || 'USD').toString().trim().toUpperCase();
  if (!raw || raw === '840') return 'USD';
  if (/^\d{3}$/.test(raw)) return 'USD';
  return /^[A-Z]{3}$/.test(raw) ? raw : 'USD';
}
/**
 * El tokenizer de CardPointe manda el token via postMessage como string JSON
 * (o a veces como string crudo). Replica exactamente el parsing que ya usaba
 * el checkout.js original para no romper compatibilidad.
 */
export function parseTokenMessage(
  raw: unknown
): { token: string; expiry?: string } | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && (parsed.token || parsed.account)) {
      return {
        token: parsed.token || parsed.account,
        expiry: parsed.expiry || parsed.expiration,
      };
    }
  } catch {
    // no era JSON — tratar como token crudo
  }
  return { token: String(raw) };
}

export function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
