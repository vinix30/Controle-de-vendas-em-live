const encoder = new TextEncoder();
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE = 'live_session';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
function bytesToHex(bytes) { return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function randomHex(size = 32) { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return bytesToHex(bytes); }
async function digest(value) { return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256);
  return bytesToHex(result);
}
function getCookie(request) {
  const part = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
  return part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : '';
}
function cookieHeader(token, maxAge = SESSION_SECONDS) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
async function createSession(env, user) {
  const token = randomHex();
  const tokenHash = await digest(token);
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run();
  await env.DB.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(tokenHash, user.id, expires).run();
  return json({ ok: true, user: publicUser(user) }, 200, { 'set-cookie': cookieHeader(token) });
}
function publicUser(user) { return { id: user.id, username: user.username, role: user.role }; }
function validCredentials(username, password) {
  return typeof username === 'string' && /^[a-zA-Z0-9._-]{3,40}$/.test(username.trim()) && typeof password === 'string' && password.length >= 10 && password.length <= 200;
}

export async function authStatus({ env }) {
  try {
    const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM auth_users').first();
    return json({ needsSetup: Number(row?.count || 0) === 0 });
  } catch {
    return json({ error: 'Tabelas de acesso não configuradas.' }, 503);
  }
}

export async function authMe({ request, env }) {
  const user = await getSessionUser(request, env);
  return user ? json({ user: publicUser(user) }) : json({ user: null }, 401);
}

export async function authLogin({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Dados inválidos.' }, 400); }
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) return json({ error: 'Informe usuário e senha.' }, 400);
  const user = await env.DB.prepare('SELECT id, username, password_hash, password_salt, role FROM auth_users WHERE username = ? COLLATE NOCASE').bind(username).first();
  const computed = await passwordHash(password, user?.password_salt || 'invalid-user-salt');
  if (!user || computed !== user.password_hash) return json({ error: 'Usuário ou senha incorretos.' }, 401);
  return createSession(env, user);
}

export async function authSetup({ request, env }) {
  const expected = env.BOOTSTRAP_SECRET;
  if (!expected) return json({ error: 'Configure o segredo de instalação no Cloudflare antes de criar o administrador.' }, 503);
  if (request.headers.get('x-bootstrap-secret') !== expected) return json({ error: 'Código de instalação incorreto.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Dados inválidos.' }, 400); }
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!validCredentials(username, password)) return json({ error: 'Use usuário de 3 a 40 caracteres e senha com pelo menos 10 caracteres.' }, 400);
  const id = crypto.randomUUID(), salt = randomHex(16), hash = await passwordHash(password, salt);
  try {
    const result = await env.DB.prepare("INSERT INTO auth_users (id, username, password_hash, password_salt, role, created_at) SELECT ?, ?, ?, ?, 'admin', ? WHERE NOT EXISTS (SELECT 1 FROM auth_users)").bind(id, username, hash, salt, new Date().toISOString()).run();
    if (!result.meta?.changes) return json({ error: 'O administrador inicial já foi criado.' }, 409);
  } catch { return json({ error: 'Não foi possível criar o administrador. Confira se o usuário já existe.' }, 409); }
  return createSession(env, { id, username, role: 'admin' });
}

export async function authLogout({ request, env }) {
  const token = getCookie(request);
  if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await digest(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
}

export async function getSessionUser(request, env) {
  const token = getCookie(request);
  if (!token || token.length > 100) return null;
  const hash = await digest(token);
  const row = await env.DB.prepare(`SELECT u.id, u.username, u.role FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`).bind(hash, new Date().toISOString()).first();
  return row || null;
}

export async function usersEndpoint({ request, env, user, id }) {
  if (user?.role !== 'admin') return json({ error: 'Acesso restrito ao administrador.' }, 403);
  if (request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, username, role, created_at FROM auth_users ORDER BY username').all();
    return json({ users: rows.results || [] });
  }
  if (request.method === 'POST' && !id) {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Dados inválidos.' }, 400); }
    const username = String(body?.username || '').trim(), password = String(body?.password || '');
    const role = body?.role === 'admin' ? 'admin' : body?.role === 'launcher' ? 'launcher' : '';
    if (!validCredentials(username, password) || !role) return json({ error: 'Usuário, perfil ou senha inválidos. A senha deve ter pelo menos 10 caracteres.' }, 400);
    const id = crypto.randomUUID(), salt = randomHex(16), hash = await passwordHash(password, salt);
    try {
      await env.DB.prepare('INSERT INTO auth_users (id, username, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, username, hash, salt, role, new Date().toISOString()).run();
      return json({ ok: true, user: { id, username, role } }, 201);
    } catch { return json({ error: 'Esse usuário já existe.' }, 409); }
  }
  if (request.method === 'DELETE' && id) {
    if (id === user.id) return json({ error: 'Não é possível remover a própria conta.' }, 400);
    const target = await env.DB.prepare('SELECT role FROM auth_users WHERE id = ?').bind(id).first();
    if (!target) return json({ error: 'Usuário não encontrado.' }, 404);
    if (target.role === 'admin') {
      const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM auth_users WHERE role = 'admin'").first();
      if (Number(count?.count || 0) <= 1) return json({ error: 'É necessário manter pelo menos um administrador.' }, 400);
    }
    await env.DB.prepare('DELETE FROM auth_users WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }
  return json({ error: 'Método não permitido.' }, 405);
}

export async function createSale({ request, env, user }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Dados inválidos.' }, 400); }
  const value = Number(body?.value), presenterId = String(body?.personId || '');
  if (!presenterId || presenterId.length > 80 || !Number.isFinite(value) || value <= 0 || value > 1000000000) return json({ error: 'Informe uma apresentadora e um valor válido.' }, 400);
  const presenter = await env.DB.prepare('SELECT id, name, room_id FROM presenters WHERE id = ?').bind(presenterId).first();
  if (!presenter) return json({ error: 'Apresentadora não encontrada.' }, 404);
  const id = crypto.randomUUID(), soldAt = new Date().toISOString();
  await env.DB.prepare('INSERT INTO sales (id, presenter_id, presenter_name, room_id, value, sold_at, legacy, launched_by) VALUES (?, ?, ?, ?, ?, ?, 0, ?)')
    .bind(id, presenter.id, presenter.name, presenter.room_id, value, soldAt, user.username).run();
  return json({ ok: true, sale: { id, personId: presenter.id, name: presenter.name, room: presenter.room_id, value, date: soldAt, launchedBy: user.username }, createdBy: user.username }, 201);
}
