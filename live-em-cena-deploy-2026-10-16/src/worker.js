import { onRequestGet, onRequestPut, onSaleRequest } from '../functions/api/state.js';
import { authStatus, authMe, authLogin, authSetup, authLogout, getSessionUser, usersEndpoint, createSale } from '../functions/api/auth.js';

function error(message, status) { return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } }); }
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!sameOrigin(request) && request.method !== 'GET') return error('Origem não permitida.', 403);
      if (url.pathname === '/api/auth/status' && request.method === 'GET') return authStatus({ env });
      if (url.pathname === '/api/auth/setup' && request.method === 'POST') return authSetup({ request, env });
      if (url.pathname === '/api/auth/login' && request.method === 'POST') return authLogin({ request, env });
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') return authLogout({ request, env });
      if (url.pathname === '/api/auth/me' && request.method === 'GET') return authMe({ request, env });

      const user = await getSessionUser(request, env);
      if (!user) return error('Faça login para continuar.', 401);
      if (url.pathname === '/api/users' || url.pathname.startsWith('/api/users/')) {
        const userMatch = url.pathname.match(/^\/api\/users(?:\/([^/]+))?$/);
        return usersEndpoint({ request, env, user, id: userMatch?.[1] ? decodeURIComponent(userMatch[1]) : null });
      }
      if (url.pathname === '/api/sales' && request.method === 'POST') return createSale({ request, env, user });
      if (url.pathname === '/api/state') {
        if (request.method === 'GET') return onRequestGet({ request, env, user });
        if (request.method === 'PUT') return user.role === 'admin' ? onRequestPut({ request, env }) : error('Somente o administrador pode alterar as configurações.', 403);
        return error('Método não permitido.', 405);
      }
      const saleMatch = url.pathname.match(/^\/api\/sales\/([^/]+)$/);
      if (saleMatch) {
        if (user.role !== 'admin') return error('Somente o administrador pode editar vendas.', 403);
        return onSaleRequest({ request, env, id: decodeURIComponent(saleMatch[1]) });
      }
      return error('Endpoint não encontrado.', 404);
    }
    return env.ASSETS.fetch(request);
  },
};
