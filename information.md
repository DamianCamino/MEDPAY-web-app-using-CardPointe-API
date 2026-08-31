# Contexto del equipo

## ⚠️ Decisión actual — Clover en pausa (vigente)

**Fuente:** Shalinder (comunicación directa al equipo).

> Actually Aonghus also mentioned me to ignore clover at this moment.

**Instrucción de Aonghus (vía Shalinder):** **ignorar Clover por ahora.** No avanzar con sandbox Clover, app Clover ni integración Marketplace hasta nueva indicación.

| Estado | Ruta |
|--------|------|
| **Pausada** | Clover Marketplace (Ruta B) — correos Kyle Aceto / Fiserv |
| **Enfoque actual** | CardPointe + integración MedPay mobile/POS — trabajar con **Shalinder** |

*Esta decisión prevalece sobre la reunión anterior (sandbox Clover) y sobre los correos de Fiserv que apuntaban a Clover.*

---

## Mensaje inicial — asignación del grupo

Hi all. I have changed this group name and added Shalinder and Inder. Guys Pablo and Damien are with us for a short period -- 2 months or so to see if they can help tackle the growing workload for the Company. The initial focus is on Cardpointe integration into the mobile/POS Med Pay application as well. Inder has started the POS work. Damien I want you to help Inder by running the application on Android Studio and helping with testing on a physical device (which I should receive tomorrow). Damien has a few issues running the project in Studio at the moment so please advise his when he posts the error messages here. Pablo please look at the Cardpointe documentation I am about to share and see how you can work with Shalinder to help with integration. thanks all.

### Roles asignados (mensaje inicial)

| Persona | Rol |
|---------|-----|
| **Inder** | POS — trabajo ya iniciado |
| **Damien** | Apoyar a Inder: Android Studio, pruebas en dispositivo físico |
| **Pablo** | Ayudar con la integración CardPointe; revisar documentación Fiserv; trabajar con **Shalinder**; ~~sandbox Clover~~ **pausado** (Aonghus) |
| **Shalinder** | Integración (pareja de trabajo de Pablo) |

*Nota: Pablo y Damien — asignación temporal (~2 meses).*

---

## Contexto de reunión (confirmación de rol — Pablo)

En reunión con el equipo se confirmó lo siguiente:

* Pablo **ayudará con la integración** de pagos en MedPay.
* El equipo **enviaría la documentación** necesaria para empezar — corresponde a los correos electrónicos de Kyle Aceto / Fiserv recogidos más abajo en este documento.
* ~~Para poder integrar, Pablo debe conseguir acceso al sandbox Clover~~ — **revocado:** Aonghus indicó ignorar Clover por ahora (Shalinder).

**Conclusión:** el rol de Pablo es **participar activamente en la integración** junto a Shalinder. Enfoque actual: **CardPointe**, no Clover.

---

## Decisión estratégica (histórica — Clover en pausa)

Following further investigations and research it has been decided to go down the Clover Route.

> **Nota:** Esta decisión quedó **en pausa**. Aonghus indicó ignorar Clover por el momento (comunicado por Shalinder). Los correos de Kyle siguen siendo referencia para cuando se retome.



Aceto, Kyle (US - Pennsylvania)<kyle.aceto@Fiserv.com>
​Aonghus O'Heocha;​Jonathan Lee​
Understood fully now, the Clover Marketplace was the key. You would want to do a Clover direct integration. Your app will exist within the Clover App market and you can order devices/manage devices and clients within CoPilot. Different path from CardPointe, but one my team supports. 

Below are some steps @Aonghus O'Heocha to getting a sandbox account stood up within Clover. My team will help with the App submission/approval process when the time comes. I will queue in a Technical Specialist who will guide you through this integration path and stay involved as an additional resource. 

The first thing you will need to do is set up a sandbox account. This will set up a merchant account for testing, as well as a Sandbox developer account for setting up your integration:   https://docs.clover.com/docs/setup-clover-sandbox-account
Once you create your Sandbox developer account, you will need to create an app.  This app only helps facilitate authentication, and grant the requested permissions for your merchants:   https://docs.clover.com/docs/creating-a-sandbox-app
Details on ecommerce permissions can be found here:   https://docs.clover.com/docs/ecommerce-app-permissions
After your app is created, you will need to install it on your Sandbox account:   https://docs.clover.com/docs/installing-your-app-to-your-test-merchant
After the app is installed, you can begin to creating your OAuth 2.0 workflow, to be able to have merchants authenticate you to use their account:   https://docs.clover.com/docs/use-oauth

This will open you guys up to leveraging MedPay within any Clover device. 


Let me know if we're more aligned now.

Kyle


Q7jSsc8UtsEKKmu!











Update 7 May 


Aceto, Kyle (US - Pennsylvania)<kyle.aceto@Fiserv.com>
​Aonghus O'Heocha;​Jonathan Lee​
Hey Guys - 

Below are our available processing endpoints. What Aonghus and I discussed is integrating MedPay to CardPointe, leveraging the Mobile SDK, specifically the Clover Go 3 to be able to offer an App driven, card present device. If MedPay, or Vital Pay/IKON EMR, has a web presence, so not an App but something online, you could leverage our Card Not Present suite for any online payments, as well as connect and of the Card Present (Web) integrated devices, which includes that rolodex of Clovers (Mini, Flex, Pocket, Compact) and Ingenicos (3600, 7000, 8000). If the goal is to offer your clinics options, adding a web based presence would be highly recommended as your software would operate on an App and Online, and use either a bluetooth device for the App and any of the other listed terminals tied to online. You could even run MedPay via a web browser on an iPad, and have a Clover Flex connected and receiving payment requests that way. 




If your goal is to enter the Clover Marketplace and be an app any Clover Client could sign up for an use, it is a different integration path. Below is how you would get started:

The first thing you will need to do is set up a sandbox account. This will set up a merchant account for testing, as well as a Sandbox developer account for setting up your integration:   https://docs.clover.com/docs/setup-clover-sandbox-account
Once you create your Sandbox developer account, you will need to create an app.  This app only helps facilitate authentication, and grant the requested permissions for your merchants:   https://docs.clover.com/docs/creating-a-sandbox-app
Details on ecommerce permissions can be found here:   https://docs.clover.com/docs/ecommerce-app-permissions
After your app is created, you will need to install it on your Sandbox account:   https://docs.clover.com/docs/installing-your-app-to-your-test-merchant
After the app is installed, you can begin to creating your OAuth 2.0 workflow, to be able to have merchants authenticate you to use their account:   https://docs.clover.com/docs/use-oauth


Let me know if you want me to setup another call to review. 

Kyle












Update 6 May 2026


Spoke to Kyle and ..


We need to produce a mobile payment application that can be used on either Android or Apple.

First version will be Android application which will will communicate with a Carpointe Go 3 device via bluetooth 




https://www.youtube.com/watch?v=ZGwHn7Wxkdk






​Aonghus O'Heocha​
To see your test transactions:


CardPointe Reporting Tool (To verify transactions)
Reporting URL: https://cardpointe-uat.cardconnect.com
Username: medpaytest
Password: UATWelcome1!




Kyle Aceto
Director | Business Development & Partner Delivery
CardConnect
Fiserv 
World’s Most Admired Companies™ 2025 | Fortune® Magazine
Fiserv | Join Our Team | Twitter | LinkedIn | Facebook

©2024 Fiserv Inc. or its affiliates. Fiserv is a registered trademark of Fiserv Inc. Privacy Notice
From Fortune. ©2024 Fortune Media IP Limited. All rights reserved. Used under license.
Aceto, Kyle (US - Pennsylvania)<kyle.aceto@Fiserv.com>
​Aonghus O'Heocha;​Jonathan Lee​
Sandbox #1 - MEDPay
API URL: https://fts-uat.cardconnect.com/cardconnect/rest/
Username: testing
Password: testing123
UAT MID:
MedPay - 800000050208


Postman Collection


Kyle Aceto
Director | Business Development & Partner Delivery
CardConnect
Fiserv 
World’s Most Admired Companies™ 2025 | Fortune® Magazine
Fiserv | Join Our Team | Twitter | LinkedIn | Facebook

©2024 Fiserv Inc. or its affiliates. Fiserv is a registered trademark of Fiserv Inc. Privacy Notice
From Fortune. ©2024 Fortune Media IP Limited. All rights reserved. Used under license.
Aceto, Kyle (US - Pennsylvania)<kyle.aceto@Fiserv.com>
​Aonghus O'Heocha;​Jonathan Lee​
Aonghus - 


Please see below for our Mobile SDK information. The first SDK is card not present, the Clover Go 3 SDK is our card present mobile SDK.


Mobile SDK (iOS + Android)
CardPointe Mobile SDK
Apple Pay
Google Pay
Device types:
Clover Go 3
Clover Go 3 | Mobile SDK






@Jonathan Lee do you mind providing me with a US address to send a couple Clover Go 3s so your team can get them to Aonghus. 


Kyle Aceto
Director | Business Development & Partner Delivery
CardConnect


























From: Aceto, Kyle (US - Pennsylvania) <kyle.aceto@Fiserv.com>
Sent: Wednesday, April 29, 2026 10:18 AM
To: Vincent Yaldoo <vyaldoo@cardconnectpartners.com>
Cc: Jonathan Lee <jl@fluid.financial>; John Katoula <jkatoula@cardconnectpartners.com>
Subject: Re: Next Steps: MED Pay Integration with CardPointe Gateway + IKON + Vital Pay





Hey Gents - 


Great news - happy to help here. Please see 3 collections of sandbox below for each integration path. All MIDS are linked, so will be able to see transaction statuses via the below reporting portal for all MID's transactions. This way, you can test surcharge functionality for each instance and see our multo-merchant reporting functionality.


From a validation perspective, I will loop in your dedicated technical specialist likely tomorrow, who will help answer any questions you have and also validate your integrations when ready. 


Sandbox #1 - MEDPay
API URL: https://fts-uat.cardconnect.com/cardconnect/rest/
Username: testing
Password: testing123
UAT MID:
MedPay - 800000050208
MedPay Surcharge - 800000050209


Sandbox #2 - IKON EMR
API URL: https://fts-uat.cardconnect.com/cardconnect/rest/
Username: testing
Password: testing123
UAT MID:
IKON EMR  - 800000050225
IKON EMR Surcharge - 800000050226


Sandbox #3 - Vital Pay
API URL: https://fts-uat.cardconnect.com/cardconnect/rest/
Username: testing
Password: testing123
UAT MID:
Vital Pay - 800000050227
Vital Pay Surcharge - 800000050228




 
CardPointe Reporting Tool (To verify transactions)
Reporting URL: https://cardpointe-uat.cardconnect.com
Username: medpaytest
Password: UATWelcome1!
 
CardPointe Terminal API (Web Based, Semi-Integration)
Terminal API URL:  https://bolt-uat.cardpointe.com/api/
AuthKey: ZCb8pPkXcZDVO0CIngLSFrBJgA/BYyUZIHT8zaj3MPg=
HSN: TBD




API Docs:
Postman Collection
 
Card Not Present
Hosted iFrame Tokenizer
CardPointe Gateway API
Void
Refund
Funding API
Fiserv ACH Processing Guide
Customer Profiles
Recurring Payments
Card Account Updater
CNP Surcharge
 
Card Present (Web-Based, Semi-Integration)
CardPointe Integrated Terminal API
Terminal API URL:  https://bolt-uat.cardpointe.com/api/
AuthKey: ZCb8pPkXcZDVO0CIngLSFrBJgA/BYyUZIHT8zaj3MPg=
HSN: TBD
Surcharge


Let me know if you need anything further to begin - happy to send out test devices if you are incorporating card present options at all. Just need an address to send and device type(s).


