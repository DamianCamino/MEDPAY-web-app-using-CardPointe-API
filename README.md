# Vital Pay — CardPointe Payment Integration

Web-based checkout for Vital Pay, integrating CardPointe (Fiserv) as the
payment processor and GoHighLevel (GHL) as the CRM/workflow platform for
Ad Vital clinics. Supports both card and ACH/bank transfer payments.

## What this is

A single Node/Express backend that:
- Exposes the CardPointe payment API (`/payments`, `/checkout`) — auth,
  capture, void, refund, inquire.
- Serves a compiled React checkout UI as static files
  (`backend/public/checkout`) — no separate frontend deployment needed.
- Handles GHL OAuth install, SSO, and custom payment provider webhooks
  (`/ghl`, `/oauth`, `/webhooks`).
- Handles Alphaeon financing sessions (`/alphaeon`).

## Project structure

```text
VitalPay2.0/
├── backend/                 # Express API + compiled checkout (deploy this)
│   ├── src/
│   │   ├── config/          # CardPointe / Alphaeon env config
│   │   ├── lib/              # Payment gateway abstraction (CardPointe, NMI)
│   │   ├── middleware/       # Auth, webhook signature verification, rate limits
│   │   ├── routes/           # payments, checkout, query, webhooks, ghl, alphaeon
│   │   ├── services/         # GHL client/SSO/session, merchant config, tx store
│   │   └── utils/            # crypto, logging, retry, idempotency
│   └── public/checkout/      # Compiled checkout UI (served statically)
├── frontend-checkout/        # React/Vite/Tailwind source for the checkout UI
├── postman/                  # CardPointe UAT + local Postman collections
└── scripts/                  # PowerShell helpers (ngrok, local dev)
```

## Requirements

- Node.js 18+
- CardPointe UAT (sandbox) or production credentials from Fiserv
- (Optional) GHL OAuth app credentials, if using the GHL integration

## Environment variables

This copy doesn't include a `.env.example`. The backend needs a `.env`
file (referenced as `infrastructure/.env` relative to `backend/src/`,
i.e. `VitalPay2.0/infrastructure/.env`) with at least:

```env
# CardPointe
CARDPOINTE_ENV=uat
CARDPOINTE_SITE_UAT=fts-uat
CARDPOINTE_MERCHID_UAT=<merchant id>
CARDPOINTE_API_USER_UAT=<api user>
CARDPOINTE_API_PASS_UAT=<api pass>

# Server
PORT=3000
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:3000
DEFAULT_PAYMENT_GATEWAY=cardpointe

# GHL (optional, only needed for GHL install/SSO/webhooks)
GHL_CLIENT_ID=
GHL_CLIENT_SECRET=
GHL_REDIRECT_URI=http://localhost:3000/oauth/installed

# Alphaeon (optional)
ALPHAEON_ENV=sandbox
```

Generate any required security keys with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Running locally

```bash
cd backend
npm install
npm run dev
```


## Backend client and gateway Core components
	
.env.example 	/ config/cardpointe.js: environment-scoped 	credentials (UAT and production side by side) selected via a single 	CARDPOINTE_ENV switch. the config module derives the gateway, 	CardSe[...]
 	
lib/cardpointe-client.js: 	a client class wrapping every 	CardPointe operation with Basic Auth header construction, a 	35-second timeout and a helper to detect gateway timeouts (respcode 62).
 	
lib/validators.js: schemas for every 	operation , rejecting 	incorrect requests before they reach 	CardPointe; and for switching to ACH payments
 	
routes/payments.js, 	routes/webhooks.js, routes/query.js: Express 	endpoints for tokenize, auth, capture, void, refund, inquire and 	funding. 
 	
server.js: 	boots the app, exposes a 	/health endpoint reporting the active CardPointe environment, and 	sets the payments routes.
 	
routes/ghl.js 	/ location-store.js / merchant-config.js: bind 	each clinic's GoHighLevel Location ID to its CardPointe merchant 	credentials, supporting the multi- client AdVital setup. This way, [...]


##Checkout

Context identification: the app waits for a payment_initiate_props message from the parent GHL frame (amount, locationId, publishableKey, orderId, transactionId, contact) before showing any form.[...]

CardPointe returns a token via postMessage, which enables the "Pay now" button once received.

Submitting payment: on submit, the token (never the raw card or bank data), amount, and order/transaction/location context are sent to POST /checkout/pay.

Backend handling: the backend resolves the clinic from locationId/publishableKey, selects that clinic's own CardPointe gateway and credentials, and authorizes the charge with an idempotency key t[...]

Result: the frontend shows a success or error screen and, either way, posts a message back to the parent GHL frame so GHL's own payment flow knows how to close out — the same postMessage patter[...]

