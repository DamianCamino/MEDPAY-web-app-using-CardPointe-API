/**
 * GHL Custom Page SSO — request user context from parent iframe.
 */
function requestGhlUserData(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.parent === window) {
      return reject(new Error('Not inside GHL iframe'));
    }

    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('SSO request timed out'));
    }, timeoutMs);

    function handler(event) {
      const data = typeof event.data === 'string' ? tryParse(event.data) : event.data;
      if (!data || data.message !== 'REQUEST_USER_DATA_RESPONSE') return;

      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(data.payload);
    }

    window.addEventListener('message', handler);
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
  });
}

async function decryptSso(encryptedData) {
  const res = await fetch('/ghl/sso/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedData }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'SSO decrypt failed');
  return data;
}

function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Resolves { locationId, sessionToken } for the current page.
 * Precedence: signed sessionToken from a real OAuth-install redirect (query
 * string) first, otherwise decrypt via the GHL iframe SSO handshake (which
 * also returns a fresh sessionToken from the backend). A bare ?locationId=
 * with no accompanying sessionToken is intentionally NOT trusted anymore —
 * that was the IDOR: anyone could type any locationId in the URL.
 */
async function resolveLocationSession() {
  const params = new URLSearchParams(window.location.search);
  const queryLocationId = params.get('locationId');
  const querySessionToken = params.get('sessionToken');

  if (queryLocationId && querySessionToken) {
    return { locationId: queryLocationId, sessionToken: querySessionToken };
  }

  try {
    const encrypted = await requestGhlUserData();
    const user = await decryptSso(encrypted);
    const locationId = user.locationId || user.activeLocation;
    if (locationId && user.sessionToken) {
      return { locationId, sessionToken: user.sessionToken };
    }
  } catch {
    // fall through
  }

  return null;
}
