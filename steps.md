# MedPay Integration - Project Steps

## ⚠️ Estado actual — Clover en pausa

**Shalinder:** *"Actually Aonghus also mentioned me to ignore clover at this moment."*

| | |
|-|-|
| **No hacer ahora** | Sandbox Clover, app Clover, OAuth Clover, Marketplace (Fases 1–12 Clover) |
| **Enfoque actual** | **CardPointe** — integración mobile/POS MedPay con **Shalinder** |
| **Referencia** | Correos Fiserv y fases Clover quedan documentadas para cuando Aonghus retome la ruta |

---

## Resumen

### Enfoque vigente — CardPointe (Ruta A)

* Integración CardPointe en la aplicación mobile/POS MedPay.
* Revisar documentación Fiserv (correos en `information.md`).
* Trabajar con **Shalinder** en la integración.
* Credenciales sandbox CardPointe disponibles (ver sección final).

### Ruta B — Clover Marketplace (PAUSADA)

* Publicar MedPay en Clover Marketplace, OAuth, dispositivos Clover, CoPilot.
* Decidida en correos de Kyle Aceto, pero **pausada por Aonghus** (vía Shalinder).
* Fases 1–12 más abajo: **no ejecutar** hasta nueva indicación.

### Objetivos adicionales

* Integrar MedPay con Vital Pay / IKON EMR (por definir en la ruta Clover).
* iOS planificado a futuro; primera versión según modelo acordado con Fiserv.

### Contacto Fiserv

Kyle Aceto — Director | Business Development & Partner Delivery, CardConnect / Fiserv

Soporte para: Sandbox, OAuth, Clover Marketplace, App Submission, Approval Process, Technical Specialist.

### Roles del equipo

Asignación inicial (~2 meses). Ver `information.md` para mensaje del grupo, reunión y correos Fiserv.

| Persona | Responsabilidad |
|---------|-----------------|
| **Pablo** | **Integración CardPointe** con Shalinder; revisar docs Fiserv; **Clover pausado** (Aonghus) |
| **Shalinder** | Liderazgo de integración (pareja de trabajo de Pablo) |
| **Inder** | POS MedPay |
| **Damien** | Android Studio + pruebas en dispositivo físico (con Inder) |
| **Aonghus / Jonathan** | Decisiones de producto, relación con Fiserv, go-live |
| **Fiserv (Kyle + Technical Specialist)** | Guía sandbox, validación, Marketplace approval |

### Contexto reunión — Pablo

* Confirmado en reunión: Pablo **ayuda con la integración**.
* La documentación a usar son los **correos de Fiserv** (ver `information.md`).
* ~~Primer paso: sandbox Clover~~ — **revocado.** Aonghus: ignorar Clover por ahora (Shalinder).

---

# Enfoque actual — CardPointe (con Shalinder)

## Checklist

* [x] Revisar documentación CardPointe en `information.md` (sandbox, API, reporting).
* [ ] Coordinar con Shalinder qué parte de la integración toca a cada uno.
* [ ] Identificar punto de integración en la app mobile/POS MedPay (con Inder/Damien si aplica).
* [x] Probar contra sandbox CardPointe (`fts-uat.cardconnect.com`) — Virtual Terminal + Postman.
* [x] Verificar transacciones en CardPointe Reporting UAT — ver [documentation.md](documentation.md) §6b.

## Entregables

* Plan de integración CardPointe acordado con Shalinder.
* Primeras pruebas en sandbox CardPointe.

---

# Fases Clover — PAUSADAS (no ejecutar)

> Retomar solo cuando Aonghus confirme. Documentación conservada como referencia.

---

# Fase 0 - Preparación

## Objetivos

* Comprender la arquitectura Clover Marketplace.
* Crear entorno de desarrollo.
* Organizar repositorio.

## Checklist

* [x] Crear repositorio Git (local + remote [Sarajesko/medpay-clover](https://github.com/Sarajesko/medpay-clover)).
* [x] Configurar proyecto en Cursor.
* [x] Crear estructura inicial.

```text
medpay-clover/
├── backend/
├── clover-app/
├── docs/
├── postman/
└── infrastructure/
```

* [x] Crear documentación inicial.
* [x] Definir arquitectura técnica (app Clover vs. app externa + OAuth).
* [x] Documentar decisión de ruta B y descarte de ruta A.

## Entregables

* Repositorio y documentación base.

---

# Fase 1 - Crear Sandbox Clover `PAUSADA`

## Documentación

* [Create global developer account](https://docs.clover.com/dev/docs/gdp-create-global-developer-account)
* [Global developer platform — get started](https://docs.clover.com/dev/docs/global-developer-platform-get-started)
* [Guía interna Fase 1](docs/sandbox-setup.md)

## Checklist

* [ ] Crear Clover Developer Sandbox.
* [ ] Crear Merchant Sandbox.
* [ ] Confirmar acceso al Developer Dashboard.
* [ ] Confirmar acceso al Merchant Dashboard.
* [ ] Guardar credenciales de acceso.
* [ ] Familiarizarse con CoPilot (pedidos y gestión de dispositivos/clientes).
* [ ] Solicitar asignación del Technical Specialist de Fiserv (vía Kyle Aceto).

## Entregables

* Developer Account
* Merchant Test Account
* Contacto con Technical Specialist establecido

---

# Fase 2 - Crear App Clover

## Documentación

https://docs.clover.com/docs/creating-a-sandbox-app

## Checklist

* [ ] Acceder al Developer Dashboard.
* [ ] Crear aplicación MedPay.
* [ ] Configurar nombre.
* [ ] Configurar descripción.
* [ ] Configurar Redirect URI.
* [ ] Obtener Client ID.
* [ ] Obtener Client Secret.
* [ ] Guardar credenciales de la aplicación.

## Entregables

* App Clover creada.

---

# Fase 3 - Configurar Permisos

## Documentación

https://docs.clover.com/docs/ecommerce-app-permissions

## Checklist

* [ ] Revisar permisos ecommerce.
* [ ] Solicitar permisos mínimos necesarios.
* [ ] Documentar permisos requeridos.
* [ ] Validar permisos con Technical Specialist.

### Posibles permisos (confirmar según flujo MedPay)

* [ ] Read Merchant
* [ ] Read Customers
* [ ] Write Customers
* [ ] Read Orders
* [ ] Write Orders
* [ ] Payments

## Entregables

* Permisos definidos y aprobados.

---

# Fase 4 - Instalar la App

## Documentación

https://docs.clover.com/docs/installing-your-app-to-your-test-merchant

## Checklist

* [ ] Instalar App en Merchant Sandbox.
* [ ] Verificar instalación.
* [ ] Verificar permisos concedidos.
* [ ] Verificar acceso API.

## Entregables

* Aplicación instalada en sandbox.

---

# Fase 5 - Implementar OAuth 2.0

## Documentación

https://docs.clover.com/docs/use-oauth

## Checklist

* [ ] Diseñar flujo OAuth.
* [ ] Crear endpoint Login Clover.
* [ ] Implementar Authorization Code Flow.
* [ ] Obtener Access Token.
* [ ] Persistir Token.
* [ ] Gestionar Refresh Token.
* [ ] Gestionar revocación.

## Entregables

* Merchant conectado correctamente vía OAuth.

---

# Fase 6 - Backend MedPay

## Documentación

https://docs.clover.com/dev/docs/rest-api-overview

## Checklist

### Configuración

* [ ] Crear proyecto backend.
* [ ] Configurar variables de entorno.
* [ ] Configurar autenticación OAuth.

### Clover API Client

* [ ] Crear CloverClient.
* [ ] Obtener Merchant Profile.
* [ ] Definir endpoints necesarios según permisos y flujo de pago acordado.
* [ ] Obtener / crear Customers (si aplica).
* [ ] Obtener / crear Orders (si aplica).
* [ ] Obtener / registrar Payments.

### Seguridad

* [ ] Logging.
* [ ] Auditoría.
* [ ] Gestión de errores.

## Entregables

* Backend funcional conectado a Clover REST API.

---

# Fase 7 - Aplicación MedPay (Clover)

## Objetivo

Primera versión funcional integrada con el ecosistema Clover.

## Decisiones pendientes

* [ ] Confirmar con Technical Specialist si la app corre **en dispositivos Clover** (app Clover nativa) o como **app externa** vía OAuth.
* [ ] Definir plataforma de primera versión (Android en terminal Clover vs. app móvil externa).

## Checklist

### Base

* [ ] Crear proyecto de aplicación.
* [ ] Configurar arquitectura.
* [ ] Configurar autenticación merchant (OAuth).

### Funcionalidades clínicas

* [ ] Login / autorización merchant.
* [ ] Buscar paciente.
* [ ] Seleccionar paciente.
* [ ] Introducir importe.
* [ ] Solicitar pago en terminal Clover.
* [ ] Mostrar resultado.
* [ ] Historial de pagos.

### Calidad

* [ ] Testing en sandbox.
* [ ] Gestión de errores.
* [ ] Logs.

## Entregables

* Aplicación funcional en entorno sandbox Clover.

---

# Fase 8 - Compatibilidad dispositivos Clover

## Objetivo

Validar funcionamiento en dispositivos Clover soportados.

## Checklist

* [ ] Clover Flex
* [ ] Clover Mini
* [ ] Clover Compact
* [ ] Clover Pocket

## Entregables

* Compatibilidad validada en dispositivos objetivo.

---

# Fase 9 - Integración Vital Pay / IKON EMR

## Objetivo

Conectar MedPay con los sistemas Vital Pay e IKON EMR dentro del modelo Clover Marketplace.

## Checklist

* [ ] Definir arquitectura de integración con Technical Specialist.
* [ ] Identificar datos compartidos (pacientes, pagos, merchants).
* [ ] Diseñar flujo multi-merchant si aplica.
* [ ] Implementar integración.
* [ ] Probar en sandbox.

## Entregables

* Integración Vital Pay / IKON EMR definida e implementada (o plan documentado).

---

# Fase 10 - Marketplace Submission

## Objetivo

Publicar MedPay en Clover Marketplace.

## Checklist

### Preparación

* [ ] Descripción comercial.
* [ ] Capturas de pantalla.
* [ ] Política de privacidad.
* [ ] Términos y condiciones.
* [ ] Información de soporte.

### Revisión (con equipo Fiserv)

* [ ] Security Review.
* [ ] Compliance Review.
* [ ] App Submission.

### Publicación

* [ ] Correcciones solicitadas.
* [ ] Aprobación.
* [ ] Publicación.

## Entregables

* App publicada en Clover Marketplace.

---

# Fase 11 - UAT (Clover Sandbox)

## Objetivo

Validar la integración completa antes de producción.

## Checklist

* [ ] Ejecutar pagos de prueba en merchant sandbox Clover.
* [ ] Verificar transacciones en Dashboard Clover.
* [ ] Verificar datos vía Clover REST API.
* [ ] Verificar reconciliación.
* [ ] Verificar devoluciones / voids (si aplica).
* [ ] Verificar gestión de errores.
* [ ] Validación con Technical Specialist de Fiserv.

## Entregables

* UAT aprobado en sandbox Clover.

---

# Fase 12 - Producción

## Checklist

* [ ] Crear aplicación producción en Clover Developer Dashboard.
* [ ] Configurar merchant real.
* [ ] Configurar OAuth producción.
* [ ] Configurar monitorización.
* [ ] Validar pagos reales.
* [ ] Go Live.

## Entregables

* MedPay operativo en Clover Marketplace.

---

# Información de referencia

## Clover (ruta activa)

* Developer Sandbox: https://docs.clover.com/docs/setup-clover-sandbox-account
* OAuth: https://docs.clover.com/docs/use-oauth
* CoPilot: gestión de dispositivos y clientes (confirmar acceso con Fiserv)

## CardPointe (ruta A — legacy, no usar como camino principal)

### Sandbox MedPay

API URL: https://fts-uat.cardconnect.com/cardconnect/rest/

Username: testing | Password: testing123

MID MedPay: 800000050208 | Surcharge: 800000050209

### Sandbox IKON EMR

MID: 800000050225 | Surcharge: 800000050226

### Sandbox Vital Pay

MID: 800000050227 | Surcharge: 800000050228

### Reporting (solo referencia ruta A)

URL: https://cardpointe-uat.cardconnect.com

Username: medpaytest | Password: UATWelcome1!

### Terminal API (solo referencia ruta A)

URL: https://bolt-uat.cardpointe.com/api/

AuthKey: ZCb8pPkXcZDVO0CIngLSFrBJgA/BYyUZIHT8zaj3MPg=

HSN: TBD
