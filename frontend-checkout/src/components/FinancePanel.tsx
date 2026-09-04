import { useEffect, useState } from 'react';
import { PaymentProps } from '../protocol';

interface Props {
  props: PaymentProps;
  onApproved: (applicationId?: string) => void;
  onDeclined: () => void;
  onEvent: (eventType: string, payload: any) => void;
}

/**
 * A diferencia del formulario "Finance with Alphaeon" del frontend de
 * referencia (que llamaba a Alphaeon directamente desde el navegador con un
 * client_secret embebido — la causa raiz del incidente de seguridad de ese
 * repo), este panel solo pide a NUESTRO backend una sesion (/alphaeon/session),
 * que nunca revela credenciales, y monta el iframe oficial de Alphaeon con esa
 * sesion. El resultado (aprobado/rechazado) llega por postMessage desde ese
 * iframe, igual que en el checkout classic.
 */
export function FinancePanel({ props, onApproved, onDeclined, onEvent }: Props) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (props.locationId) qs.set('locationId', props.locationId);
    if (props.publishableKey) qs.set('publishableKey', props.publishableKey);
    if (props.mode) qs.set('mode', props.mode);

    fetch(`/alphaeon/session?${qs}`)
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg.iframeBaseUrl) return;
        const params = new URLSearchParams({
          partner_identifier: 'medpay',
          partner_tracking_guid: cfg.partnerTrackingGuid,
        });
        if (props.contact?.name) {
          const [first, ...rest] = props.contact.name.split(' ');
          params.set('first_name', first);
          if (rest.length) params.set('last_name', rest.join(' '));
        }
        if (props.contact?.email) params.set('email', props.contact.email);
        if (props.contact?.phone) params.set('mobile_phone', props.contact.phone);

        setIframeUrl(`${cfg.iframeBaseUrl}/location/${cfg.merchantId}?${params}`);
      })
      .catch(() => setIframeUrl(null));
  }, [props.locationId, props.publishableKey, props.mode]);

  useEffect(() => {
    function handler(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object' || data.source !== 'alphaeon-credit-portal') return;

      onEvent(data.eventType, data.payload);

      if (data.eventType === 'credit_decision') {
        const approved = data.payload?.status === 'approved';
        if (approved) onApproved(data.payload?.application_id);
        else onDeclined();
      }
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onApproved, onDeclined, onEvent]);

  return (
    <div className="animate-in fade-in duration-300">
      <iframe
        title="Alphaeon financing"
        src={iframeUrl ?? undefined}
        className="w-full h-[520px] border border-gray-200/60 rounded-xl bg-white shadow-sm"
        frameBorder={0}
        scrolling="yes"
        allow="geolocation; microphone; camera"
      />
    </div>
  );
}
