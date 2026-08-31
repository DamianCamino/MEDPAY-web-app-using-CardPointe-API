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
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, '*');
  }
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
