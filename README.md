# MedPay — Integración de pagos

## ⚠️ Estado actual

**Clover en pausa** — Aonghus indicó ignorar Clover por ahora (comunicado por Shalinder).

**Enfoque vigente:** integración **CardPointe** en MedPay mobile/POS, con **Shalinder**.

**Repositorio GitHub:** [github.com/Sarajesko/medpay-clover](https://github.com/Sarajesko/medpay-clover)

## Documentación

| Archivo | Contenido |
|---------|-----------|
| **[docs/document-work-completed.md](docs/document-work-completed.md)** | **Work completed — one-page summary (EN)** |
| **[docs/document-requirements-and-workflow.md](docs/document-requirements-and-workflow.md)** | **Requirements & workflow — one-page summary (EN)** |
| [docs/informe-trabajo-realizado.md](docs/informe-trabajo-realizado.md) | Trabajo ya hecho — detalle completo (ES) |
| [docs/checklist-integracion.md](docs/checklist-integracion.md) | Checklist técnico paso a paso con enlaces |
| [docs/plan-integracion.md](docs/plan-integracion.md) | Plan por fases (integración pendiente) |
| [documentation.md](documentation.md) | Aprendizaje CardPointe y referencia práctica |
| [docs/postman-guide.md](docs/postman-guide.md) | Guía Postman UAT |
| [steps.md](steps.md) | Checklist por fases del proyecto |
| [information.md](information.md) | Contexto del equipo, reunión y correos Fiserv |
| [docs/architecture.md](docs/architecture.md) | Arquitectura técnica y decisiones |
| **[docs/vitalpay-marketplace-setup.md](docs/vitalpay-marketplace-setup.md)** | **Vital Pay — ngrok + Marketplace registration** |
| **[docs/cardpointe-integration.md](docs/cardpointe-integration.md)** | **CardPointe — MedPay & Vital Pay (pasos de integración)** |
| **[docs/proceso-vital-pay-advital.md](docs/proceso-vital-pay-advital.md)** | **Vital Pay en Ad Vital — paso a paso para principiantes (ES)** |
| **[docs/clover-go3-android-studio.md](docs/clover-go3-android-studio.md)** | **Clover Go 3 — contexto, credenciales y Android Studio (ES)** |

## Estructura

```text
├── backend/          # Vital Pay API — CardPointe + GHL queryUrl
├── docs/             # Documentación técnica
├── postman/          # Colecciones y pruebas API
└── infrastructure/   # .env y configuración de despliegue
```

## Rutas

| Ruta | Estado |
|------|--------|
| **CardPointe** (mobile/POS) | **Activa** — ver checklist en [steps.md](steps.md) |
| **Clover Marketplace** | **Pausada** — ver [docs/sandbox-setup.md](docs/sandbox-setup.md) cuando se retome |

## Próximo paso

Ver [documentation.md](documentation.md) → sección 9. Coordinar con **Shalinder** y probar Gateway API en Postman.
