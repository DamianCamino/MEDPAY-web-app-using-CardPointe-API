# Cambios de seguridad aplicados

Este paquete es la **misma app** (mismo backend, mismo formulario `manage.html`),
con 5 correcciones de seguridad aplicadas. Probado end-to-end antes de entregarlo.

## 1. IDOR crítico en `/ghl/locations/:locationId/config` — CORREGIDO

**Antes:** cualquiera que escribiera/adivinara un `locationId` en la URL podía
leer o **sobrescribir** las credenciales de CardPointe de esa clínica.

**Ahora:** ambas rutas (`GET /ghl/locations/:locationId` y
`POST /ghl/locations/:locationId/config`) exigen un header
`Authorization: Bearer <sessionToken>`. Ese token:

- Se emite firmado (HMAC-SHA256, `src/services/session-token.js`) y **atado a un `locationId` específico**, con expiración de 30 min.
- Se genera solo en dos momentos legítimos:
  1. Al completar el OAuth real de instalación de GHL (`GET /ghl/installed`) — se agrega a la URL de redirect hacia `manage.html`.
  2. Al resolver el SSO del iframe de GHL (`POST /ghl/sso/decrypt`) — se devuelve junto con los datos del usuario.
- El middleware `requireLocationSession` valida la firma, la expiración, **y que el `locationId` del token coincida con el de la URL**. Si no coincide → `403`. Si falta o es inválido → `401`.

El formulario (`manage.html`/`manage.js`) ya no confía en `?locationId=` suelto —
ahora usa `resolveLocationSession()` (en `ghl-sso.js`) que solo acepta un
`locationId` acompañado de su `sessionToken` correspondiente.

**Verificado:** probé instalar dos clínicas de prueba y usar el token de una
para intentar leer/sobrescribir la otra → rechazado con `403`.

## 2. `GET /ghl/locations` y `/locations/:id` — Protegidos

- `GET /ghl/locations` (listaba **todas** las clínicas instaladas, sin auth) ahora requiere header `X-Admin-Key` que coincida con `ADMIN_API_KEY` en `.env`. Es un endpoint de operaciones internas, no de cara al usuario.
- `GET /ghl/locations/:locationId` ahora requiere el mismo `sessionToken` del punto 1.

## 3. Firma de ambos webhooks

- `POST /ghl/webhook` (instalación/desinstalación) y `POST /webhooks/cardpointe` (settlement/ACH) ahora pasan por `verifyHmacSignature` (`src/middleware/verify-webhook-signature.js`), que verifica una firma HMAC-SHA256 sobre el body crudo.
- **Importante — leer antes de ir a producción:** GoHighLevel firma sus webhooks de marketplace con un **par de llaves RSA** (no un secreto compartido) según su documentación actual — hay que revisar sus docs vigentes al momento de integrar y, si corresponde, cambiar el verificador a RSA-SHA256 con la llave pública de GHL. Para CardPointe/Fiserv, confirma con Fiserv qué mecanismo de firma usa tu cuenta (a veces es allowlist de IP en vez de firma). Dejé el HMAC como comportamiento seguro por defecto: **si no configuras el secreto, en producción (`NODE_ENV=production`) rechaza todo**; en desarrollo deja pasar sin firma para no bloquear tus pruebas locales.

## 4. Credenciales cifradas en reposo

- `src/utils/crypto.js`: cifrado AES-256-GCM.
- `location-store.js` ahora cifra automáticamente `apiUser`, `apiPass` (CardPointe) y `accessToken`/`refreshToken` (OAuth de GHL) antes de guardarlos, y los descifra de forma transparente al leer. Sigue siendo un `Map()` en memoria (se pierde al reiniciar) — pero **ya queda listo** para cuando se conecte una base de datos real: los valores que se persistirían ya llegan cifrados.
- Requiere `CREDENTIALS_ENC_KEY` en `.env` (32 bytes en hex — instrucciones abajo).

## 5. Auth + rate limiting en `/payments/*`

- Todas las rutas de `/payments/*` (tokenize, authorize, capture, void, refund, transactions) ahora requieren header `X-Api-Key` igual a `PAYMENTS_API_KEY`.
- Rate limiting agregado con `express-rate-limit`:
  - General: 300 requests / 15 min por IP, en toda la API.
  - Estricto en `POST /ghl/locations/:locationId/config` (el endpoint más sensible): 20 requests / 15 min.

## Variables nuevas requeridas en `.env`

Ya están documentadas en `infrastructure/.env.example`. Genera cada una con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `SESSION_SECRET`
- `CREDENTIALS_ENC_KEY` (debe ser exactamente 32 bytes en hex)
- `ADMIN_API_KEY`
- `PAYMENTS_API_KEY`
- `GHL_WEBHOOK_SECRET` (opcional en dev, requerido en producción)
- `CARDPOINTE_WEBHOOK_SECRET` (opcional en dev, requerido en producción)

## Cómo correrlo (igual que antes)

```bash
cd backend
npm install
cp ../infrastructure/.env.example ../infrastructure/.env
# Rellena las variables nuevas de arriba en ese .env
npm start
```

Para probar el formulario sin OAuth real de GHL, usa el endpoint de dev (solo
activo con `NODE_ENV=development`):

```bash
curl -X POST http://localhost:3000/ghl/dev/install \
  -H "Content-Type: application/json" \
  -d '{"locationId":"mi-clinica-test"}'
```

La respuesta trae un `manageUrl` con el `sessionToken` ya incluido — ábrelo en
el navegador y el formulario va a funcionar exactamente igual que antes, pero
ahora de forma segura.

## Lo que NO cambié (fuera de alcance de este pase)

- No agregué persistencia en base de datos real (sigue en memoria) — el cifrado ya está listo para cuando se agregue.
- No implementé la verificación RSA real de GHL (ver nota en punto 3) — necesita confirmarse contra la documentación vigente de GHL al momento de integrar.
