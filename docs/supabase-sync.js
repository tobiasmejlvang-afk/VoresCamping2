(() => {
  'use strict';

  const CONFIG = {
    url: 'https://qeezdlbpbhmasanliwwm.supabase.co',
    key: 'sb_publishable_LmMWD-V9QkvtkKYeNrGRVg_jkAAaqj7',
    storageKey: 'voresCamping_clean_v22_2',
    table: 'camping_app_state',
    schemaVersion: 25,
    debounceMs: 1200
  };

  const sdk = window.supabase;
  if (!sdk?.createClient) {
    console.warn('Supabase SDK kunne ikke indlæses. Appen fortsætter lokalt.');
    return;
  }

  const client = sdk.createClient(CONFIG.url, CONFIG.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 5 } }
  });

  let session = null;
  let channel = null;
  let syncTimer = null;
  let applyingRemote = false;
  let lastRemoteRevision = 0;
  let lastSyncedJson = '';
  const deviceId = getDeviceId();
  const originalSetItem = localStorage.setItem.bind(localStorage);

  window.VCSync = {
    client,
    getSession: () => session,
    syncNow: () => pushLocalState(true),
    signOut: () => client.auth.signOut(),
    openLogin: () => showAuthDialog('login')
  };

  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (key === CONFIG.storageKey && !applyingRemote) scheduleSync();
  };

  init().catch(error => {
    console.error('Supabase initialisering fejlede', error);
    setStatus('offline', 'Kun lokal lagring');
  });

  async function init() {
    injectUi();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    await handleSession(data.session);
    client.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => handleSession(nextSession), 0);
    });
    window.addEventListener('online', () => session && pushLocalState(false));
    window.addEventListener('offline', () => setStatus('offline', 'Offline – gemmer lokalt'));
  }

  async function handleSession(nextSession) {
    session = nextSession;
    updateAccountUi();
    if (!session) {
      stopRealtime();
      setStatus('local', 'Lokal tilstand');
      return;
    }
    setStatus('syncing', 'Synkroniserer…');
    await ensureProfile();
    await initialSync();
    startRealtime();
    setStatus('online', 'Synkroniseret');
  }

  async function ensureProfile() {
    const user = session.user;
    await client.from('profiles').upsert({
      id: user.id,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Campist'
    }, { onConflict: 'id' });
  }

  async function initialSync() {
    const userId = session.user.id;
    const { data, error } = await client
      .from(CONFIG.table)
      .select('state, revision, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;

    const localJson = localStorage.getItem(CONFIG.storageKey);
    if (!data) {
      if (localJson) await pushLocalState(true);
      else await client.from(CONFIG.table).insert({ user_id: userId, state: {}, schema_version: CONFIG.schemaVersion, device_id: deviceId });
      return;
    }

    lastRemoteRevision = Number(data.revision || 0);
    const remoteJson = JSON.stringify(data.state || {});
    if (!localJson || isLocalEmpty(localJson)) {
      applyRemote(remoteJson);
    } else if (localJson !== remoteJson) {
      const choice = await resolveConflict(data.updated_at);
      if (choice === 'remote') applyRemote(remoteJson);
      else await pushLocalState(true);
    } else {
      lastSyncedJson = localJson;
    }
  }

  function isLocalEmpty(json) {
    try {
      const value = JSON.parse(json);
      return !value || (!value.visited?.length && !value.wishlist?.length && !value.routes?.length && !value.albumItems?.length);
    } catch { return true; }
  }

  async function resolveConflict(remoteUpdatedAt) {
    return new Promise(resolve => {
      const dlg = document.createElement('dialog');
      dlg.className = 'sync-conflict-dialog';
      dlg.innerHTML = `<form method="dialog"><h3>Der findes data på begge enheder</h3><p>Cloud-versionen blev senest ændret ${formatDate(remoteUpdatedAt)}. Vælg hvilken version der skal bruges.</p><div class="sync-dialog-actions"><button value="remote" class="primary-btn">Brug cloud-version</button><button value="local" class="ghost-btn">Behold denne enhed</button></div></form>`;
      document.body.appendChild(dlg);
      dlg.addEventListener('close', () => { const value = dlg.returnValue || 'remote'; dlg.remove(); resolve(value); }, { once: true });
      dlg.showModal();
    });
  }

  function scheduleSync() {
    if (!session) return;
    clearTimeout(syncTimer);
    setStatus('syncing', 'Gemmer…');
    syncTimer = setTimeout(() => pushLocalState(false), CONFIG.debounceMs);
  }

  async function pushLocalState(force) {
    if (!session || !navigator.onLine) {
      setStatus('offline', 'Offline – gemmer lokalt');
      return false;
    }
    const json = localStorage.getItem(CONFIG.storageKey);
    if (!json || (!force && json === lastSyncedJson)) {
      setStatus('online', 'Synkroniseret');
      return true;
    }
    let parsed;
    try { parsed = JSON.parse(json); } catch { return false; }

    setStatus('syncing', 'Gemmer…');
    const { data, error } = await client.from(CONFIG.table).upsert({
      user_id: session.user.id,
      state: parsed,
      schema_version: CONFIG.schemaVersion,
      device_id: deviceId
    }, { onConflict: 'user_id' }).select('revision').single();

    if (error) {
      console.error('Cloud-gemning fejlede', error);
      setStatus('error', 'Synkronisering fejlede');
      return false;
    }
    lastRemoteRevision = Number(data.revision || lastRemoteRevision);
    lastSyncedJson = json;
    setStatus('online', 'Synkroniseret');
    return true;
  }

  function startRealtime() {
    stopRealtime();
    channel = client.channel(`camping-state-${session.user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: CONFIG.table,
        filter: `user_id=eq.${session.user.id}`
      }, payload => {
        const row = payload.new;
        if (!row?.state || row.device_id === deviceId) return;
        const revision = Number(row.revision || 0);
        if (revision <= lastRemoteRevision) return;
        lastRemoteRevision = revision;
        const remoteJson = JSON.stringify(row.state);
        if (remoteJson !== localStorage.getItem(CONFIG.storageKey)) applyRemote(remoteJson);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setStatus('online', 'Synkroniseret');
      });
  }

  function stopRealtime() {
    if (channel) client.removeChannel(channel);
    channel = null;
  }

  function applyRemote(json) {
    applyingRemote = true;
    originalSetItem(CONFIG.storageKey, json);
    lastSyncedJson = json;
    applyingRemote = false;
    setStatus('online', 'Opdateret fra cloud');
    setTimeout(() => location.reload(), 450);
  }

  function injectUi() {
    const root = document.createElement('div');
    root.id = 'sync-account-widget';
    root.className = 'sync-account-widget';
    root.innerHTML = `<button id="sync-status-btn" class="sync-status-btn" type="button"><span class="sync-dot"></span><span id="sync-status-label">Lokal tilstand</span></button><button id="sync-account-btn" class="sync-account-btn" type="button">Log ind</button>`;
    document.body.appendChild(root);
    root.querySelector('#sync-status-btn').onclick = () => session ? pushLocalState(true) : showAuthDialog('login');
    root.querySelector('#sync-account-btn').onclick = () => session ? showAccountDialog() : showAuthDialog('login');
  }

  function updateAccountUi() {
    const btn = document.querySelector('#sync-account-btn');
    if (!btn) return;
    btn.textContent = session ? (session.user.email?.split('@')[0] || 'Min konto') : 'Log ind';
  }

  function setStatus(kind, label) {
    const widget = document.querySelector('#sync-account-widget');
    const text = document.querySelector('#sync-status-label');
    if (!widget || !text) return;
    widget.dataset.status = kind;
    text.textContent = label;
  }

  function showAuthDialog(mode = 'login') {
    const dlg = document.createElement('dialog');
    dlg.className = 'auth-dialog';
    dlg.innerHTML = `<form method="dialog" class="auth-card"><button class="auth-close" value="cancel" aria-label="Luk">×</button><div class="auth-logo">🏕️</div><h2>${mode === 'signup' ? 'Opret bruger' : 'Log ind'}</h2><p>Gem campingpladser, ruter og feriealbum sikkert og synkroniseret på tværs af enheder.</p><label>E-mail<input id="auth-email" class="field" type="email" autocomplete="email" required></label><label>Adgangskode<input id="auth-password" class="field" type="password" minlength="8" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required></label><div id="auth-message" class="auth-message"></div><button id="auth-submit" type="button" class="primary-btn">${mode === 'signup' ? 'Opret bruger' : 'Log ind'}</button><button id="auth-switch" type="button" class="link-btn">${mode === 'signup' ? 'Jeg har allerede en bruger' : 'Opret en ny bruger'}</button><button id="auth-reset" type="button" class="link-btn">Glemt adgangskode?</button></form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove(), { once: true });
    dlg.querySelector('#auth-switch').onclick = () => { dlg.close(); showAuthDialog(mode === 'signup' ? 'login' : 'signup'); };
    dlg.querySelector('#auth-reset').onclick = async () => {
      const email = dlg.querySelector('#auth-email').value.trim();
      const msg = dlg.querySelector('#auth-message');
      if (!email) { msg.textContent = 'Skriv din e-mail først.'; return; }
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      msg.textContent = error ? translateError(error.message) : 'Der er sendt en mail med nulstilling.';
    };
    dlg.querySelector('#auth-submit').onclick = async () => {
      const email = dlg.querySelector('#auth-email').value.trim();
      const password = dlg.querySelector('#auth-password').value;
      const msg = dlg.querySelector('#auth-message');
      msg.textContent = 'Arbejder…';
      const result = mode === 'signup'
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) msg.textContent = translateError(result.error.message);
      else if (mode === 'signup' && !result.data.session) msg.textContent = 'Tjek din e-mail og bekræft oprettelsen.';
      else dlg.close();
    };
    dlg.showModal();
  }

  function showAccountDialog() {
    const dlg = document.createElement('dialog');
    dlg.className = 'auth-dialog';
    dlg.innerHTML = `<form method="dialog" class="auth-card"><button class="auth-close" value="cancel">×</button><div class="auth-logo">☁️</div><h2>Min konto</h2><p>${escapeHtml(session.user.email || '')}</p><div class="account-status"><strong>Automatisk synkronisering</strong><span>Aktiv på denne enhed</span></div><button id="account-sync" type="button" class="primary-btn">Synkroniser nu</button><button id="account-signout" type="button" class="ghost-btn">Log ud</button></form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove(), { once: true });
    dlg.querySelector('#account-sync').onclick = async () => { await pushLocalState(true); dlg.close(); };
    dlg.querySelector('#account-signout').onclick = async () => { await client.auth.signOut(); dlg.close(); };
    dlg.showModal();
  }

  function getDeviceId() {
    const key = 'voresCamping_device_id';
    let value = localStorage.getItem(key);
    if (!value) { value = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random()}`; originalSetItem(key, value); }
    return value;
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat('da-DK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
    catch { return 'for nylig'; }
  }

  function translateError(message) {
    const m = String(message || '').toLowerCase();
    if (m.includes('invalid login')) return 'Forkert e-mail eller adgangskode.';
    if (m.includes('already registered')) return 'E-mailen er allerede oprettet.';
    if (m.includes('password')) return 'Adgangskoden skal være mindst 8 tegn.';
    if (m.includes('email')) return 'Kontrollér e-mailadressen.';
    return message || 'Der opstod en fejl.';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
})();
