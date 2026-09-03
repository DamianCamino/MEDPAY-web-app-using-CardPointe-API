import { useEffect, useState, useCallback } from 'react';
import { PaymentMethodToggle } from './components/PaymentMethodToggle';
import { TokenizerPanel } from './components/TokenizerPanel';
import { FinancePanel } from './components/FinancePanel';
import { PaymentSummary } from './components/PaymentSummary';
import { ErrorModal } from './components/ErrorModal';
import { SuccessScreen } from './components/SuccessScreen';
import {
  PaymentMethod,
  PaymentProps,
  postToParent,
  tryParseJson,
  formatMoney,
} from './protocol';

const ALPHAEON_MIN_AMOUNT = 250;

/**
 * Modo standalone: si esta pagina se abre SIN estar embebida en un iframe
 * (window.parent === window), no va a llegar el mensaje `payment_initiate_props`
 * que normalmente manda GHL. En ese caso construimos las props directamente
 * desde los query params, para poder probar tarjeta/ACH/Alphaeon sin GHL.
 *
 * Ejemplo: /checkout/?amount=25&locationId=loc_123&mode=test
 */
function readStandaloneProps(): PaymentProps | null {
  if (window.parent !== window) return null; // esta embebido, esperar mensaje real

  const qs = new URLSearchParams(window.location.search);
  if (!qs.has('amount') && !qs.has('test')) return null;

  return {
    amount: qs.has('amount') ? Number(qs.get('amount')) : 25,
    currency: qs.get('currency') || 'USD',
    orderId: qs.get('orderId') || `TEST-${Date.now()}`,
    transactionId: qs.get('transactionId') || undefined,
    locationId: qs.get('locationId') || undefined,
    publishableKey: qs.get('publishableKey') || undefined,
    mode: qs.get('mode') || 'test',
    contact: {
      id: qs.get('contactId') || undefined,
      name: qs.get('contactName') || 'Test Patient',
      email: qs.get('contactEmail') || undefined,
      phone: qs.get('contactPhone') || undefined,
      postalCode: qs.get('postalCode') || undefined,
    },
  };
}

export default function App() {
  const [paymentProps, setPaymentProps] = useState<PaymentProps | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [accountType, setAccountType] = useState<'ECHK' | 'ESAV'>('ECHK');
  const [token, setToken] = useState<{ value: string; expiry?: string } | null>(null);
  const [postalCode, setPostalCode] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Recibir props desde GHL (o inyectarlas nosotros mismos en modo prueba) ---
  useEffect(() => {
    const standalone = readStandaloneProps();
    if (standalone) {
      setPaymentProps(standalone);
      setIsStandalone(true);
      setPostalCode(standalone.contact?.postalCode || '');
    }

    function handler(event: MessageEvent) {
      const data = typeof event.data === 'string' ? tryParseJson(event.data) : event.data;
      if (!data || !data.type) return;

      if (data.type === 'payment_initiate_props') {
        setPaymentProps(data as PaymentProps);
        setPostalCode((data as PaymentProps).contact?.postalCode || '');
      } else if (data.type === 'setup_initiate_props') {
        setPaymentProps({ ...(data as PaymentProps), amount: 0, mode: 'setup' });
      }
    }

    window.addEventListener('message', handler);
    postToParent({ type: 'custom_provider_ready', loaded: true });
    return () => window.removeEventListener('message', handler);
  }, []);

  // Reiniciar el token cada vez que cambia el metodo
  useEffect(() => {
    setToken(null);
    setError(null);
  }, [method]);

  const handleToken = useCallback((value: string, expiry?: string) => {
    setToken({ value, expiry });
  }, []);

  async function handlePay() {
    if (!paymentProps || paying) return;
    if (!token?.value) {
      setError('Enter your payment details above.');
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const res = await fetch('/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.value,
          expiry: token.expiry,
          accttype: method === 'bank' ? accountType : undefined,
          achEntryCode: method === 'bank' ? 'WEB' : undefined,
          postal: method === 'card' ? (postalCode || paymentProps.contact?.postalCode) : undefined,
          amount: paymentProps.amount,
          currency: paymentProps.currency || 'USD',
          capture: 'Y',
          orderId: paymentProps.orderId,
          transactionId: paymentProps.transactionId,
          locationId: paymentProps.locationId,
          publishableKey: paymentProps.publishableKey,
          mode: paymentProps.mode,
          contactId: paymentProps.contact?.id,
          contact: paymentProps.contact,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.approved) {
        throw new Error(data.error || data.resptext || 'Payment failed');
      }

      setSuccess(
        `${formatMoney(paymentProps.amount, paymentProps.currency)} — confirmation ${
          data.chargeId || data.authcode || ''
        }`
      );
      postToParent({ type: 'custom_element_success_response', chargeId: data.chargeId });
    } catch (err: any) {
      const message = err.message || 'Payment failed';
      setError(message);
      postToParent({
        type: 'custom_element_error_response',
        error: { description: message },
      });
    } finally {
      setPaying(false);
    }
  }

  function handleCancel() {
    postToParent({ type: 'custom_element_close_response' });
  }

  function handleAlphaeonApproved(applicationId?: string) {
    setSuccess(`Financing approved — application ${applicationId || ''}`);
    postToParent({ type: 'custom_element_success_response', chargeId: applicationId });
  }

  function handleAlphaeonDeclined() {
    setError('Financing application was not approved.');
    postToParent({
      type: 'custom_element_error_response',
      error: { description: 'Alphaeon financing was not approved.' },
    });
  }

  async function reportAlphaeonEvent(eventType: string, payload: any) {
    if (!paymentProps) return;
    try {
      await fetch('/alphaeon/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          locationId: paymentProps.locationId,
          publishableKey: paymentProps.publishableKey,
          orderId: paymentProps.orderId,
          transactionId: paymentProps.transactionId,
          amount: paymentProps.amount,
          currency: paymentProps.currency || 'USD',
          applicationId: payload?.application_id,
          accountNumber: payload?.alphaeon_account_number,
          status: payload?.status,
        }),
      });
    } catch {
      // No bloquea la UI — la decision de credito ya ocurrio en Alphaeon.
    }
  }

  if (!paymentProps) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Waiting for payment details…
      </div>
    );
  }

  const showBank = true;
  const showFinance = paymentProps.amount >= ALPHAEON_MIN_AMOUNT;

  return (
    <div className="min-h-screen w-full py-4 sm:py-8">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100/80 w-full max-w-[480px] overflow-auto" style={{ maxHeight: 'calc(100vh - 32px)' }}>
          {/* ── Brand accent bar ── */}
          <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-dark to-brand rounded-t-2xl" />

          <div className="p-5 sm:p-7 lg:p-8">
            {/* ── Logo + Header ── */}
            <div className="flex flex-col items-center mb-6">
              <img
                src="/checkout/logo.jpeg"
                alt="Logo"
                className="h-28 w-auto rounded-2xl object-contain shadow-md border border-gray-100/50"
              />
            </div>

            <ErrorModal message={error} onClose={() => setError(null)} />

            {success ? (
              <SuccessScreen detail={success} />
            ) : (
              <>
                {/* ── Payment Method selector ── */}
                <div className="mb-5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Payment Method
                  </label>
                  <PaymentMethodToggle
                    method={method}
                    onChange={setMethod}
                    showBank={showBank}
                    showFinance={showFinance}
                  />
                </div>

                {method !== 'alphaeon' && (
                  <div className="mb-5">
                    <PaymentSummary
                      amount={paymentProps.amount}
                      currency={paymentProps.currency}
                    />
                  </div>
                )}

                {method === 'alphaeon' ? (
                  <FinancePanel
                    props={paymentProps}
                    onApproved={handleAlphaeonApproved}
                    onDeclined={handleAlphaeonDeclined}
                    onEvent={reportAlphaeonEvent}
                  />
                ) : (
                  <TokenizerPanel
                    method={method}
                    locationId={paymentProps.locationId}
                    publishableKey={paymentProps.publishableKey}
                    accountType={accountType}
                    onAccountTypeChange={setAccountType}
                    onToken={handleToken}
                  />
                )}

                {method === 'card' && (
                  <div className="mt-4">
                    <label htmlFor="postalCode" className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Billing ZIP / Postal code
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      inputMode="text"
                      autoComplete="postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 19102"
                      maxLength={10}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 hover:border-gray-300 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all duration-200"
                    />
                  </div>
                )}

                {method !== 'alphaeon' && (
                  <div className="mt-7 space-y-2.5">
                    <button
                      onClick={handlePay}
                      disabled={paying || !token}
                      className="relative w-full bg-brand hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-[0_2px_8px_rgba(92,103,255,0.35)] hover:shadow-[0_4px_14px_rgba(92,103,255,0.4)] overflow-hidden group"
                    >
                      {/* Subtle shimmer overlay */}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" aria-hidden="true" />
                      <span className="relative flex items-center justify-center gap-2">
                        {paying ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Processing…
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                            Pay now
                          </>
                        )}
                      </span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* ── Trust footer ── */}
                {method !== 'alphaeon' && (
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <span>Secured with 256-bit TLS encryption</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
