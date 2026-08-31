# Documentación — Lo aprendido (CardPointe / MedPay)

Documento principal de aprendizaje y referencia práctica.  
Actualizado: junio 2026 — Pablo García Márquez.

---

## 1. Contexto del proyecto

| Qué | Detalle |
|-----|---------|
| **Objetivo** | Integrar pagos CardPointe en la aplicación mobile/POS **MedPay** |
| **Rol de Pablo** | Ayudar a **Shalinder** con la integración (~2 meses) |
| **Emails Fiserv** | Material para **entender el proceso**, no checklist para hacer todo solo |
| **Clover Marketplace** | **Pausado** — Aonghus: ignorar Clover por ahora (Shalinder) |

Más contexto de equipo y correos: [information.md](information.md)  
Checklist de fases: [steps.md](steps.md)

---

## 2. ¿Qué es CardPointe?

**CardPointe** es la plataforma de pagos de **Fiserv / CardConnect**. Actúa como intermediario seguro entre MedPay y la red bancaria.

```text
Paciente → MedPay (app) → CardPointe → Red de tarjetas → Banco
                              ↓
                    Reporting / conciliación
```

MedPay **no** se conecta directamente al banco. CardPointe procesa el pago y devuelve si fue **aprobado o rechazado**.

### Piezas del ecosistema CardPointe

| Pieza | Qué es | Uso |
|-------|--------|-----|
| **Gateway API** | API REST (`/auth`, `/capture`, `/void`…) | Integración en código (backend/app) |
| **Reporting** | Portal web UAT | Ver transacciones, dashboard, conciliación |
| **Virtual Terminal** | Formulario web en el portal | Cobros manuales de prueba |
| **CardSecure / Token** | Tokenización de tarjeta | Guardar alias seguro en vez del número completo |
| **Mobile SDK** | Librería iOS/Android + lector Bluetooth | App + Clover Go 3 (ruta alternativa) |
| **Terminal API** | API para terminales físicos (Flex, Mini…) | Semi-integración web + terminal |

**Enfoque actual del equipo:** Gateway API + Reporting. Mobile SDK / Terminal API según confirme Shalinder.

---

## 3. Conceptos clave

### Merchant y MID

Cada comercio (clínica, producto) tiene un **MID** (Merchant ID). Casi todas las llamadas API incluyen `merchid`.

| Producto | MID | Surcharge MID |
|----------|-----|---------------|
| MedPay | `800000050208` | `800000050209` |
| IKON EMR | `800000050225` | `800000050226` |
| Vital Pay | `800000050227` | `800000050228` |

### UAT (sandbox) vs producción

| Entorno | Propósito | Dinero real |
|---------|-----------|-------------|
| **UAT** | Pruebas, tarjetas de test | No |
| **Producción** | Pagos reales en clínicas | Sí |

Todo lo probado hasta ahora es **UAT**.

### Authorization vs Capture

| Paso | Significado |
|------|-------------|
| **Authorization** | El banco aprueba/reserva el importe |
| **Capture** | Se confirma el cobro efectivo |
| **Sale** (Authorize + Capture) | Ambos en un solo paso — lo usado en Virtual Terminal |

### Token

Sustituto seguro de la tarjeta. Ejemplo real de prueba: `9418594164541111`.  
En integración se guarda el token, no el PAN (`4111…`).

### Surcharge (recargo)

Recargo por uso de tarjeta (ej. 3%). En prueba: $10.00 + $0.30 = **$10.30**.

---

## 4. Dos formas de acceder a CardPointe

Son **complementarias**, no la misma cosa:

### A) Portal Reporting (web con login)

| Campo | Valor |
|-------|--------|
| **URL** | https://cardpointe-uat.cardconnect.com |
| **Usuario** | `medpaytest` |
| **Contraseña** | `UATWelcome1!` |

**Para qué:** dashboard, Reporting, Virtual Terminal, ver transacciones.

**Estado:** acceso verificado — Pablo entró correctamente (cuenta MedPay).

### B) Gateway API (REST, sin pantalla de login)

| Campo | Valor |
|-------|--------|
| **URL base** | `https://fts-uat.cardconnect.com/cardconnect/rest/` |
| **Usuario** | `testing` |
| **Contraseña** | `testing123` |
| **Autenticación** | Basic Auth en cada petición HTTP |

**Para qué:** integración programática (lo que hará MedPay con Shalinder).

**Prueba de credenciales:** `GET` a la URL base con Basic Auth → respuesta:

```html
<h1>CardConnect REST Servlet</h1>
```

Eso **no es un error**. Significa: servidor alcanzable y credenciales válidas (HTTP 200).  
Si fueran incorrectas → `401 Unauthorized`.

---

## 5. Prueba realizada — Virtual Terminal

**Fecha:** 06/10/2026  
**Merchant:** MedPay Surcharge  
**Método:** Sale (Authorize and Capture)  
**Entrada:** Virtual Terminal (manual)

| Campo | Valor |
|-------|--------|
| Subtotal | $10.00 USD |
| Surcharge (3%) | $0.30 |
| **Total capturado** | **$10.30** |
| Status | **Captured** |
| Response | Approval (RPCT - 000) |
| Transaction # | `R161789130678` |
| Auth Code | `PPS167` |
| Tarjeta (enmascarada) | XXXX XXXX XXXX 1111 |
| Token | `9418594164541111` |
| CVV / AVS | Match |

**Tarjeta de prueba usada:** Visa `4111 1111 1111 1111`, CVV `123`, caducidad futura (ej. 12/2028).

**Conclusión:** sandbox UAT operativo; credenciales de reporting correctas; flujo de pago entendido en la práctica.

### Otras tarjetas de test (UAT)

| Marca | Número |
|-------|--------|
| Visa | `4111 1111 1111 1111` |
| Visa/Mastercard alt. | `4444 3333 2222 1111` |
| Mastercard | `5454 5454 5454 5454` |

Documentación: [CardPointe Gateway — UAT test cards](https://developer.cardpointe.com/guides/cardpointe-gateway)

---

## 6. Flujos comparados

```text
┌─────────────────────────────────────────────────────────────┐
│  VIRTUAL TERMINAL (hecho)                                    │
│  Portal web → rellenar formulario → Captured → Reporting    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  GATEWAY API (hecho)                                         │
│  MedPay/Postman → PUT /auth → JSON respuesta → Reporting    │
└─────────────────────────────────────────────────────────────┘
```

### Ejemplo Gateway API — autorizar $10.00

```http
PUT https://fts-uat.cardconnect.com/cardconnect/rest/auth
Authorization: Basic <base64(testing:testing123)>
Content-Type: application/json

{
  "merchid": "800000050208",
  "account": "4111111111111111",
  "expiry": "1228",
  "amount": "1000",
  "currency": "USD",
  "name": "Test Patient",
  "capture": "y"
}
```

- `amount`: en **centavos** → `1000` = $10.00  
- `merchid`: `800000050208` = MedPay (usar este MID en API; surcharge requiere campos extra)  
- Respuesta esperada: `respstat: "A"` (aprobado) + `retref` (ID transacción)

---

## 6b. Verificación en Reporting UAT (06/10/2026)

Todas las pruebas visibles en https://cardpointe-uat.cardconnect.com → **Reporting**.

**Resumen:** 5 transacciones | Total $30.60

| Transaction # | Origen | Location | Importe | Auth Code | Status | Qué fue |
|---------------|--------|----------|---------|-----------|--------|---------|
| `R161104731332` | Postman API | `800000050208` | $10.00 | PPS553 | **Captured** | `PUT /auth` MID MedPay |
| `R161057131302` | Postman/API | MedPay Surcharge | $10.00 | — | **Declined** | MID surcharge sin campos → `Surcharge Not Supported` |
| `R161789130678` | Virtual Terminal | MedPay Surcharge | $10.30 | PPS167 | **Captured** | Prueba manual Pablo (+3% recargo) |
| `R161920030330` | Virtual Terminal | IKON EMR Surcharge | $10.30 | PPS951 | **Captured** | Prueba manual otra cuenta |
| `R161596730131` | Virtual Terminal | IKON EMR Surcharge | $5.15 | — | **Declined** | Tarjeta inválida (últimos 4: `7777`) |

**Conclusión:** ciclo API → Reporting verificado. Virtual Terminal y Postman producen transacciones visibles en el mismo portal.

---

## 7. Enlaces útiles

| Recurso | URL |
|---------|-----|
| Gateway API (referencia) | https://developer.cardpointe.com/cardconnect-api |
| Guías de integración | https://developer.cardpointe.com/guides/cardpointe-gateway |
| Soporte CardPointe | https://support.cardpointe.com/cardpointe-gateway-api/ |
| Postman (guía oficial) | https://developer.cardpointe.com/guides/cardpointe-gateway |

**Terminal API** (solo si Shalinder confirma esa vía):

- URL: `https://bolt-uat.cardpointe.com/api/`
- AuthKey: ver [information.md](information.md)
- HSN: TBD

---

## 8. Rol de Pablo — resumen

| Hacer ahora | No hacer ahora |
|-------------|----------------|
| Entender CardPointe | Sandbox Clover |
| Ayudar a Shalinder con integración | Implementar todo lo de los emails solo |
| Probar UAT (Reporting, Virtual Terminal, Postman) | Marketplace / OAuth Clover |
| Pedir repo y reparto de tareas a Shalinder | Asumir arquitectura sin coordinar |

---

## 9. Postman — Gateway API

Colección importable en `postman/`:

| Archivo | Contenido |
|---------|-----------|
| `CardPointe-UAT.postman_collection.json` | Requests: credential test, auth, inquire |
| `CardPointe-UAT.postman_environment.json` | Variables UAT (URL, credenciales, MIDs) |

Guía paso a paso: [docs/postman-guide.md](docs/postman-guide.md)

### Resultado de prueba API (06/2026)

**Request:** `PUT /auth` — MedPay `800000050208`, $10.00, tarjeta `4111…`

```json
{
  "respstat": "A",
  "resptext": "Approval",
  "respcode": "000",
  "amount": "10.00",
  "retref": "161104731332",
  "authcode": "PPS553",
  "merchid": "800000050208"
}
```

**Nota:** MID Surcharge (`800000050209`) por API devolvió `Surcharge Not Supported` sin campos extra. Virtual Terminal sí aplica surcharge; API requiere configuración adicional.

---

## 10. Próximos pasos

- [x] Acceso Reporting UAT
- [x] Prueba Virtual Terminal (transacción capturada)
- [x] Entender diferencia API vs portal
- [x] Colección Postman + primera llamada `PUT /auth`
- [x] Verificar transacciones en Reporting (5 pruebas documentadas — sección 6b)
- [ ] Mensaje a Shalinder (repo + reparto de tareas)
- [ ] Integrar en código MedPay (cuando haya acceso al repo)

---

## 11. Otros documentos del repo

| Archivo | Contenido |
|---------|-----------|
| [documentation.md](documentation.md) | Este documento — aprendizaje y referencia práctica |
| [information.md](information.md) | Correos Fiserv, equipo, decisiones |
| [steps.md](steps.md) | Checklist por fases |
| [docs/architecture.md](docs/architecture.md) | Arquitectura técnica |
| [infrastructure/.env.example](infrastructure/.env.example) | Plantilla variables de entorno |
| [docs/postman-guide.md](docs/postman-guide.md) | Guía Postman UAT |
