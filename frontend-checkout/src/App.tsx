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
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-[480px] overflow-auto" style={{ maxHeight: 'calc(100vh - 32px)' }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Vital Pay</h1>
            {isStandalone && (
              <p className="text-center text-[11px] uppercase tracking-wide text-amber-600 font-semibold mb-4">
                Standalone test mode ({paymentProps.mode})
              </p>
            )}

            <ErrorModal message={error} onClose={() => setError(null)} />

            {success ? (
              <SuccessScreen detail={success} />
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
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
                  <div className="mb-4">
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
                  <div className="mt-3">
                    <label htmlFor="postalCode" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                )}

                {method !== 'alphaeon' && (
                  <div className="mt-6 space-y-2">
                    <button
                      onClick={handlePay}
                      disabled={paying || !token}
                      className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors shadow-sm"
                    >
                      {paying ? 'Processing…' : 'Pay now'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-full text-gray-500 text-sm py-2 hover:text-gray-700"
                    >
                      Cancel
                    </button>
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
