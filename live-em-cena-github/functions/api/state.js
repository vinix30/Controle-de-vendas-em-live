const roomIds = ['room1', 'room2', 'room3', 'room4', 'room5'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ env }) {
  try {
    const [roomRows, presenterRows, saleRows, app] = await Promise.all([
      env.DB.prepare('SELECT id, name FROM rooms').all(),
      env.DB.prepare('SELECT id, name, role, room_id, sort_order FROM presenters ORDER BY sort_order, name').all(),
      env.DB.prepare('SELECT id, presenter_id, presenter_name, room_id, value, sold_at, legacy FROM sales ORDER BY sold_at DESC').all(),
      env.DB.prepare('SELECT currents_json, switches FROM app_state WHERE id = 1').first(),
    ]);
    const salesLog = (saleRows.results || []).map(s => ({
      id: s.id, personId: s.presenter_id, name: s.presenter_name, room: s.room_id,
      value: Number(s.value), date: s.sold_at, legacy: Boolean(s.legacy),
    }));
    const salesTotals = new Map();
    for (const sale of salesLog) salesTotals.set(sale.personId, (salesTotals.get(sale.personId) || 0) + sale.value);
    const people = (presenterRows.results || []).map(p => ({
      id: p.id, name: p.name, role: p.role, room: p.room_id,
      sales: Number((salesTotals.get(p.id) || 0).toFixed(2)),
    }));
    const roomNames = Object.fromEntries((roomRows.results || []).map(r => [r.id, r.name]));
    let currents = {};
    try { currents = JSON.parse(app?.currents_json || '{}'); } catch { currents = {}; }
    for (const room of roomIds) {
      if (!people.some(p => p.id === currents[room] && p.room === room)) {
        currents[room] = people.find(p => p.room === room)?.id || '';
      }
    }
    return json({ people, roomNames, currents, switches: Number(app?.switches || 0), salesLog, empty: people.length === 0 && salesLog.length === 0 });
  } catch (error) {
    return json({ error: 'Não foi possível ler os dados compartilhados.' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  let state;
  try { state = await request.json(); }
  catch { return json({ error: 'Corpo JSON inválido.' }, 400); }

  if (!Array.isArray(state.people) || !Array.isArray(state.salesLog) || !state.currents || typeof state.currents !== 'object' || Array.isArray(state.currents)) {
    return json({ error: 'Formato de dados inválido.' }, 400);
  }
  if (state.people.length > 1000 || state.salesLog.length > 100000) {
    return json({ error: 'O envio excede o limite permitido.' }, 413);
  }

  const statements = [];
  for (const roomId of roomIds) {
    const name = String(state.roomNames?.[roomId] || `Sala ${roomIds.indexOf(roomId) + 1}`).trim().slice(0, 32);
    statements.push(env.DB.prepare('INSERT INTO rooms (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name').bind(roomId, name));
  }
  const validPresenterIds = new Set();
  state.people.forEach((p, index) => {
    if (!p?.id || !String(p.name || '').trim()) return;
    const id = String(p.id).slice(0, 80), room = roomIds.includes(p.room) ? p.room : roomIds[0];
    validPresenterIds.add(id);
    statements.push(env.DB.prepare(`INSERT INTO presenters (id, name, role, room_id, sort_order) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, room_id = excluded.room_id, sort_order = excluded.sort_order`)
      .bind(id, String(p.name).trim().slice(0, 80), String(p.role || '').slice(0, 120), room, index));
  });
  for (const room of roomIds) {
    const currentId = state.currents[room];
    if (currentId && !validPresenterIds.has(String(currentId))) state.currents[room] = '';
  }
  statements.push(env.DB.prepare('INSERT INTO app_state (id, currents_json, switches) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET currents_json = excluded.currents_json, switches = excluded.switches')
    .bind(JSON.stringify(state.currents), Math.max(0, Number(state.switches) || 0)));

  const salesSeen = new Set();
  for (const s of state.salesLog) {
    const id = String(s?.id || '').slice(0, 80), value = Number(s?.value);
    if (!id || salesSeen.has(id) || !Number.isFinite(value) || value <= 0 || value > 1000000000) continue;
    salesSeen.add(id);
    const room = roomIds.includes(s.room) ? s.room : roomIds[0];
    const soldAt = Number.isNaN(Date.parse(s.date)) ? new Date().toISOString() : new Date(s.date).toISOString();
    statements.push(env.DB.prepare('INSERT OR IGNORE INTO sales (id, presenter_id, presenter_name, room_id, value, sold_at, legacy) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, String(s.personId || '').slice(0, 80), String(s.name || '').slice(0, 80), room, value, soldAt, s.legacy ? 1 : 0));
  }

  if (validPresenterIds.size) {
    const placeholders = [...validPresenterIds].map(() => '?').join(',');
    statements.push(env.DB.prepare(`DELETE FROM presenters WHERE id NOT IN (${placeholders})`).bind(...validPresenterIds));
  } else {
    statements.push(env.DB.prepare('DELETE FROM presenters'));
  }
  try {
    await env.DB.batch(statements);
    return json({ ok: true });
  } catch (error) {
    return json({ error: 'Não foi possível salvar no banco compartilhado.' }, 500);
  }
}

export async function onSaleRequest({ request, env, id }) {
  if (!id || id.length > 80) return json({ error: 'Venda inválida.' }, 400);
  if (request.method === 'PUT') {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Corpo JSON inválido.' }, 400); }
    const value = Number(body?.value);
    if (!Number.isFinite(value) || value <= 0 || value > 1000000000) return json({ error: 'Informe um valor de venda válido.' }, 400);
    try {
      const result = await env.DB.prepare('UPDATE sales SET value = ? WHERE id = ?').bind(value, id).run();
      if (!result.meta?.changes) return json({ error: 'Venda não encontrada.' }, 404);
      return json({ ok: true });
    } catch (error) {
      return json({ error: 'Não foi possível atualizar a venda.' }, 500);
    }
  }
  return json({ error: 'Método não permitido.' }, 405);
}
