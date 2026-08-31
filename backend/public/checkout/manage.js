(function () {
  const tabProd = document.getElementById('tabProd');
  const tabUat = document.getElementById('tabUat');
  const prodFields = document.getElementById('prodFields');
  const uatFields = document.getElementById('uatFields');
  const form = document.getElementById('cardpointeForm');
  const statusMsg = document.getElementById('statusMsg');
  const submitBtn = document.getElementById('submitBtn');
  const locationCallout = document.getElementById('locationCallout');
  const locationInfo = document.getElementById('location-info');

  const STORAGE_KEY = 'cardpointeConfigDraft'; // only non-sensitive fields go here

  tabProd.addEventListener('click', () => {
    tabProd.classList.add('active');
    tabUat.classList.remove('active');
    prodFields.style.display = '';
    uatFields.style.display = 'none';
  });

  tabUat.addEventListener('click', () => {
    tabUat.classList.add('active');
    tabProd.classList.remove('active');
    uatFields.style.display = '';
    prodFields.style.display = 'none';
  });

  let locationId = null;
  let sessionToken = null;

  function authHeaders(extra = {}) {
    return { ...extra, Authorization: `Bearer ${sessionToken}` };
  }

  function setStatus(msg, isError) {
    statusMsg.textContent = msg;
    statusMsg.classList.toggle('error', Boolean(isError));
  }

  // Only cache non-sensitive draft fields locally. Never cache API
  // passwords/usernames — those come straight from the server each load.
  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.surcharge != null) document.getElementById('surcharge').value = data.surcharge;
      if (data.achLimit != null) document.getElementById('achLimit').value = data.achLimit;
    } catch {
      /* ignore */
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          surcharge: document.getElementById('surcharge').value,
          achLimit: document.getElementById('achLimit').value,
        })
      );
    } catch {
      /* ignore */
    }
  }

  async function init() {
    loadDraft();

    const session = await resolveLocationSession();
    if (!session) {
      locationCallout.style.display = '';
      form.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
      return;
    }

    locationId = session.locationId;
    sessionToken = session.sessionToken;

    locationInfo.style.display = '';
    locationInfo.textContent = `Clínica: ${locationId}`;

    await loadCurrentConfig();
  }

  async function loadCurrentConfig() {
    try {
      const res = await fetch(`/ghl/locations/${encodeURIComponent(locationId)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo cargar la configuración');
      const data = await res.json();

      if (data.settings?.surcharge != null) document.getElementById('surcharge').value = data.settings.surcharge;
      if (data.settings?.achLimit != null) document.getElementById('achLimit').value = data.settings.achLimit;

      // We never receive apiUser/apiPass back from the server (write-only for
      // secrets) — only whether each mode is already configured.
      if (data.hasLiveConfig) {
        document.getElementById('prodApiPass').placeholder = '•••••••• (ya configurado — dejar vacío para no cambiar)';
      }
      if (data.hasTestConfig) {
        document.getElementById('uatApiPass').placeholder = '•••••••• (ya configurado — dejar vacío para no cambiar)';
      }
    } catch (err) {
      setStatus(err.message, true);
    }
  }

  function collectCreds(prefix) {
    const site = document.getElementById(`${prefix}Site`).value.trim();
    const merchId = document.getElementById(`${prefix}Merchid`).value.trim();
    const apiUser = document.getElementById(`${prefix}ApiUser`).value.trim();
    const apiPass = document.getElementById(`${prefix}ApiPass`).value;

    if (!site && !merchId && !apiUser && !apiPass) return null;
    return { site, merchId, apiUser, apiPass };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!locationId) return;

    setStatus('Guardando…', false);
    submitBtn.disabled = true;
    saveDraft();

    const payload = {
      prod: collectCreds('prod'),
      uat: collectCreds('uat'),
      surcharge: document.getElementById('surcharge').value,
      achLimit: document.getElementById('achLimit').value,
    };

    try {
      const res = await fetch(`/ghl/locations/${encodeURIComponent(locationId)}/config`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');

      setStatus('✓ Configuración guardada.', false);
      // Clear password fields from the DOM after a successful save — they've
      // done their job and shouldn't linger in the page/autofill.
      document.getElementById('prodApiPass').value = '';
      document.getElementById('uatApiPass').value = '';
      await loadCurrentConfig();
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    form.reset();
    document.getElementById('surcharge').value = '3.99';
    setStatus('', false);
  });

  init();
})();
