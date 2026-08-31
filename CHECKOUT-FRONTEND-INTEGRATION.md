# Vital Pay — Checkout frontend integrado (card + bank transfer + Alphaeon)

## Qué cambió respecto al zip anterior

Se agregó `frontend-checkout/`, un proyecto React + Vite + Tailwind que reemplaza el checkout
HTML/CSS plano que vivía en `backend/public/checkout/index.html` + `checkout.js` + `checkout.css`.
El diseño (selector de método de pago en tarjetas, resumen de pago, layout) está inspirado en
`alpha-eon-frontend` (alpha-eon-frontend.vercel.app), pero **la captura de datos de pago es
distinta y deliberadamente más segura**:

| | alpha-eon-frontend (referencia) | Este integración |
|---|---|---|
| Captura de tarjeta | `<input>` de texto plano en estado de React (`CardPaymentForm.tsx`) | Iframe Hosted Tokenizer de CardPointe — el PAN nunca toca el DOM ni el backend |
| Captura ACH | `<input>` de texto plano (`BankTransferForm.tsx`) | Mismo iframe tokenizer, en modo ACH |
| Alphaeon | Llamada directa del navegador a Alphaeon con `client_id`/`client_secret` **hardcodeados en el bundle** (el incidente de seguridad que ya reportó GitGuardian en ese repo) | Reusa `/alphaeon/session` del backend — el secret nunca sale del servidor |

**Importante:** el `client_secret` de Alphaeon expuesto en `alpha-eon-frontend-main.zip` (ver su
propio `SECURITY_INCIDENT.md`) debe rotarse con Alphaeon si aún no se ha hecho — esto es
independiente de esta integración y sigue pendiente.

## Cómo reconstruir el frontend

```bash
cd frontend-checkout
npm install
npm run build
```

Esto compila a `backend/public/checkout/` (mismo folder que ya sirve el backend en `/checkout`).
**No borra** `manage.html`, `manage.js`, `setup.html`, `ghl-mock.html`, `ghl-sso.js` ni `logo.svg`
— esos siguen ahí (admin de clínica / instalador GHL), `vite.config.ts` tiene `emptyOutDir: false`
a propósito por esto. Si alguna vez cambias esa config, ten cuidado.

## Cómo probar tarjeta y bank transfer sin GHL

La SPA soporta un "modo standalone": si se abre fuera de un iframe (no embebida por GHL) y la URL
trae `?amount=` (o `?test=1`), construye las props de pago directamente desde los query params en
lugar de esperar el mensaje `payment_initiate_props` de GHL.

```
http://localhost:3000/checkout/?amount=25&mode=test
http://localhost:3000/checkout/?amount=25&mode=test&locationId=TU_LOCATION_ID
```

Desde ahí puedes probar:
- **Credit/Debit Card**: iframe tokenizer en modo tarjeta.
- **Bank Transfer**: iframe tokenizer en modo ACH + selector Checking/Savings. Usa
  `RoutingNumber/AccountNumber` de prueba (ej. `061000052/1234567890`) en el campo del iframe.
- **Finance with Alphaeon**: solo aparece si `amount >= 250`; usa `/alphaeon/session`, que
  necesita credenciales Alphaeon configuradas en `location-store` (o en `infrastructure/.env`
  como fallback global).

Cualquier transacción real solo llega hasta donde CardPointe UAT / Alphaeon sandbox respondan —
sigue aplicando todo lo señalado en el plan de reconciliación ACH (`achLimit` aún no se valida en
`checkout.js`, `/funding` aún no está integrado, etc., ver `plan-ach-funding-reconciliation.md`
de la conversación anterior).

## Arquitectura del componente

```
frontend-checkout/src/
  App.tsx                  — orquesta protocolo GHL + tokenizer + Alphaeon
  protocol.ts               — helpers: postToParent, parseTokenMessage, formatMoney
  components/
    PaymentMethodToggle.tsx — selector card / bank / alphaeon
    TokenizerPanel.tsx       — iframe CardPointe (card Y bank, mismo iframe)
    FinancePanel.tsx         — iframe Alphaeon vía /alphaeon/session
    PaymentSummary.tsx
    ErrorBanner.tsx
    SuccessScreen.tsx
```

El contrato con GHL (mensajes `payment_initiate_props`, `custom_provider_ready`,
`custom_element_success_response`, `custom_element_error_response`,
`custom_element_close_response`) es exactamente el mismo que ya usaba el `checkout.js` clásico,
así que no rompe la integración existente con GHL como custom payment provider.

## Verificado en este entorno

- `npm run build` compila sin errores (Vite 5, ~154KB JS + 10KB CSS gzip ~50KB).
- Backend levantado localmente: `/checkout/` sirve la SPA (200), `/checkout/config?method=bank`
  devuelve `tokenizerUrl` correcto en modo ACH, y `/checkout/manage.html`, `/checkout/setup.html`,
  `/checkout/logo.svg` siguen respondiendo 200 (no se rompió nada del admin/instalador GHL).
- **No verificado aquí** (este entorno no tiene salida de red a `cardconnect.com` ni a Alphaeon):
  una transacción real de principio a fin contra CardPointe UAT o Alphaeon sandbox. Eso lo
  confirmas tú al correrlo local o en tu entorno de staging.
