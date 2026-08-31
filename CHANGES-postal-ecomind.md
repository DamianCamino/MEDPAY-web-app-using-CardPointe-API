# Cambios: AVS (postal) + ecomind

Cambios aplicados en respuesta al feedback de Fiserv sobre la validación
CardPointe Gateway ("ecomind is required for any card not present
transaction" + recomendación de AVS con ZIP/dirección).

## Archivos modificados

### Frontend (`frontend-checkout/src`)
- **`protocol.ts`** — `Contact` ahora incluye `postalCode?: string`.
- **`App.tsx`**
  - Nuevo estado `postalCode`, prellenado desde `paymentProps.contact?.postalCode`
    (tanto en el flujo real de GHL vía `postMessage` como en modo standalone
    por query params: `?postalCode=19102`).
  - Nuevo input "Billing ZIP / Postal code", visible solo para `method === 'card'`
    (no aplica a ACH).
  - `handlePay()` ahora manda `postal` en el body de `POST /checkout/pay`
    cuando el método es tarjeta.

### Backend (`backend/src`)
- **`routes/checkout.js`** — `/pay` acepta `postal` en el body y lo reenvía a
  `gateway.authorize(...)`, con fallback a `contact?.postalCode` si no vino
  explícito.
- **`lib/validators/cardpointe.js`** (`authSchema`)
  - `postal: z.string().max(10).optional()` — alfanumérico (no solo dígitos)
    para soportar códigos postales internacionales.
  - `country: z.string().length(2).optional()` — CardPointe recomienda
    incluirlo cuando el postal es alfanumérico; si se omite, el gateway
    asume `US` por defecto.
  - `ecomind: z.enum(['E', 'R', 'T']).optional()` — **sin default a nivel de
    schema** a propósito, para no forzar `ecomind` en transacciones ACH (ver
    más abajo).
- **`lib/gateways/cardpointe-gateway.js`** (`authorize()`)
  - Añade `postal` y `country` al payload real enviado a CardPointe.
  - Añade `ecomind: 'E'` **solo cuando la transacción es de tarjeta**
    (`!transaction.accttype`); para ACH se omite, ya que Fiserv lo exige
    específicamente para "card not present", no para eCheck.

## Qué falta / próximos pasos sugeridos
- Añadir campos de dirección completa (`address`, `city`, `region`) si más
  adelante se quiere AVS completo en vez de solo ZIP (recomendación de
  Fiserv, no bloqueante).
- Probar en UAT: un `postal` correcto vs. uno incorrecto para confirmar que
  `avsresp` cambia en la respuesta (evidencia para Fiserv).
