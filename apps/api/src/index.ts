export interface Env {
  DB: D1Database;
  CACHE?: KVNamespace;
  APP_ORIGIN: string;
  ADMIN_SETUP_SECRET: string;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
  API_PUBLIC_BASE_URL?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  WXPUSHER_APP_TOKEN?: string;
  WXPUSHER_UIDS?: string;
}

type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  status: string;
  email_verified_at: string | null;
};

type RelayKey = {
  id: string;
  user_id: string;
  key_hash: string;
  status: string;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8'
};

const defaultPublicSettings = {
  siteName: 'API Relay',
  appMode: 'self',
  registrationEnabled: true,
  captchaEnabled: false,
  captchaSiteKey: '',
  apiPublicBaseUrl: ''
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), env);

    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/v1/')) {
        return withCors(await handleRelay(request, env, ctx), env);
      }

      if (url.pathname.startsWith('/api/')) {
        return withCors(await handleApi(request, env, ctx), env);
      }

      return withCors(json({ ok: true, service: 'api-relay-worker' }), env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return withCors(json({ error: getErrorMessage(error) }, status), env);
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledJobs(env));
  }
};

async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;

  if (method === 'GET' && path === '/api/public/bootstrap') return getBootstrap(env);
  if (method === 'POST' && path === '/api/setup') return setupSuperAdmin(request, env);
  if (method === 'POST' && path === '/api/auth/register') return registerUser(request, env);
  if (method === 'GET' && path === '/api/auth/verify') return verifyEmail(request, env);
  if (method === 'POST' && path === '/api/auth/login') return loginUser(request, env);

  const user = await requireSession(request, env);
  if (method === 'POST' && path === '/api/auth/logout') return logoutUser(request, env);
  if (method === 'GET' && path === '/api/me') return json({ user: cleanUser(user) });
  if (method === 'GET' && path === '/api/dashboard') return getDashboard(env, user);
  if (method === 'GET' && path === '/api/usage') return getUsage(env, user, url);
  if (method === 'GET' && path === '/api/api-keys') return listApiKeys(env, user);
  if (method === 'POST' && path === '/api/api-keys') return createApiKey(request, env, user);
  if (method === 'DELETE' && path.startsWith('/api/api-keys/')) return deleteApiKey(env, user, path.split('/').pop() || '');
  if (method === 'GET' && path === '/api/models') return listModels(env);

  if (!isAdmin(user)) return json({ error: '需要管理员权限' }, 403);

  if (method === 'GET' && path === '/api/admin/settings') return getAdminSettings(env);
  if (method === 'PUT' && path === '/api/admin/settings') return updateAdminSettings(request, env);
  if (method === 'GET' && path === '/api/admin/users') return listUsers(env);
  if (method === 'PATCH' && path.startsWith('/api/admin/users/')) return updateUser(request, env, path.split('/').pop() || '');
  if (method === 'GET' && path === '/api/admin/channels') return listChannels(env);
  if (method === 'POST' && path === '/api/admin/channels') return createChannel(request, env);
  if (method === 'PUT' && path.startsWith('/api/admin/channels/')) return updateChannel(request, env, path.split('/').pop() || '');
  if (method === 'DELETE' && path.startsWith('/api/admin/channels/')) return deleteChannel(env, path.split('/').pop() || '');
  if (method === 'POST' && path === '/api/admin/health-check') {
    ctx.waitUntil(checkChannelHealth(env));
    return json({ ok: true });
  }
  if (method === 'POST' && path === '/api/admin/worker-usage-check') {
    ctx.waitUntil(captureWorkerUsage(env));
    return json({ ok: true });
  }
  if (method === 'GET' && path === '/api/admin/worker-usage') return listWorkerUsage(env);

  return json({ error: '接口不存在' }, 404);
}

async function getBootstrap(env: Env): Promise<Response> {
  const [hasAdmin, settings] = await Promise.all([
    hasSuperAdmin(env),
    getSettings(env)
  ]);
  return json({
    hasAdmin,
    setupRequired: !hasAdmin,
    settings: {
      ...defaultPublicSettings,
      siteName: settings.siteName ?? defaultPublicSettings.siteName,
      appMode: settings.appMode ?? defaultPublicSettings.appMode,
      registrationEnabled: settings.registrationEnabled ?? true,
      captchaEnabled: settings.captchaEnabled ?? false,
      captchaSiteKey: settings.captchaSiteKey ?? '',
      apiPublicBaseUrl: env.API_PUBLIC_BASE_URL ?? ''
    }
  });
}

async function setupSuperAdmin(request: Request, env: Env): Promise<Response> {
  if (await hasSuperAdmin(env)) return json({ error: '超级管理员已存在，初始化入口已关闭' }, 403);
  const body = await readJson(request);
  if (!env.ADMIN_SETUP_SECRET || body.secret !== env.ADMIN_SETUP_SECRET) return json({ error: '管理员密钥不正确' }, 403);
  assertEmail(body.email);
  assertPassword(body.password);

  const now = new Date().toISOString();
  const userId = id('usr');
  const passwordHash = await hashPassword(body.password);
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, status, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, body.email.toLowerCase(), body.name || 'Super Admin', passwordHash, 'super_admin', 'active', now, now, now).run();

  const settings: Record<string, unknown> = {
    siteName: body.siteName || 'API Relay',
    appMode: body.appMode === 'multi' ? 'multi' : 'self',
    registrationEnabled: body.appMode === 'multi',
    captchaEnabled: false,
    healthCheckIntervalMinutes: 60,
    workerUsageIntervalMinutes: 60
  };
  await saveSettings(env, settings);
  const session = await createSession(env, userId);
  return json({ token: session, user: cleanUser({ id: userId, email: body.email.toLowerCase(), name: body.name || 'Super Admin', role: 'super_admin', status: 'active', email_verified_at: now }) });
}

async function registerUser(request: Request, env: Env): Promise<Response> {
  const settings = await getSettings(env);
  if (settings.registrationEnabled === false) return json({ error: '注册已关闭' }, 403);
  const body = await readJson(request);
  assertEmail(body.email);
  assertPassword(body.password);
  if (settings.captchaEnabled === true) await verifyCaptcha(body.captchaToken, env);

  const userId = id('usr');
  const passwordHash = await hashPassword(body.password);
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, body.email.toLowerCase(), body.name || body.email.split('@')[0], passwordHash, 'user', 'active').run();

  const rawToken = randomToken(32);
  await env.DB.prepare(
    'INSERT INTO email_verifications (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(id('emv'), userId, await sha256(rawToken), plusHours(24)).run();
  await sendVerificationEmail(env, body.email.toLowerCase(), rawToken);
  return json({ ok: true, message: '注册成功，请检查邮箱完成验证' }, 201);
}

async function verifyEmail(request: Request, env: Env): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!token) return json({ error: '缺少验证令牌' }, 400);
  const tokenHash = await sha256(token);
  const record = await env.DB.prepare(
    'SELECT * FROM email_verifications WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > datetime("now")'
  ).bind(tokenHash).first<any>();
  if (!record) return json({ error: '验证链接无效或已过期' }, 400);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').bind(now, now, record.user_id),
    env.DB.prepare('UPDATE email_verifications SET consumed_at = ? WHERE id = ?').bind(now, record.id)
  ]);
  return json({ ok: true, message: '邮箱已验证，可以登录' });
}

async function loginUser(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  assertEmail(body.email);
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(body.email.toLowerCase()).first<any>();
  if (!user || !(await verifyPassword(body.password || '', user.password_hash))) return json({ error: '邮箱或密码错误' }, 401);
  if (user.status !== 'active') return json({ error: '账号已停用' }, 403);
  const token = await createSession(env, user.id);
  return json({ token, user: cleanUser(user) });
}

async function logoutUser(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true });
}

async function getDashboard(env: Env, user: AuthedUser): Promise<Response> {
  const admin = isAdmin(user);
  const userFilter = admin ? '' : 'WHERE user_id = ?';
  const binds = admin ? [] : [user.id];
  const [totals, today, keys, channels, recent] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS requests, COALESCE(SUM(total_tokens),0) AS tokens, COALESCE(AVG(latency_ms),0) AS latency FROM usage_logs ${userFilter}`).bind(...binds).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS requests, COALESCE(SUM(total_tokens),0) AS tokens FROM usage_logs ${admin ? 'WHERE' : 'WHERE user_id = ? AND'} date(created_at) = date('now')`).bind(...binds).first<any>(),
    env.DB.prepare(admin ? 'SELECT COUNT(*) AS count FROM api_keys WHERE status = "active"' : 'SELECT COUNT(*) AS count FROM api_keys WHERE user_id = ? AND status = "active"').bind(...binds).first<any>(),
    env.DB.prepare('SELECT COUNT(*) AS count, SUM(CASE WHEN health_status = "ok" THEN 1 ELSE 0 END) AS healthy FROM channels WHERE status = "active"').first<any>(),
    env.DB.prepare(`SELECT created_at, path, model, status, total_tokens, latency_ms FROM usage_logs ${userFilter} ORDER BY created_at DESC LIMIT 12`).bind(...binds).all<any>()
  ]);
  return json({ totals, today, keys, channels, recent: recent.results || [] });
}

async function getUsage(env: Env, user: AuthedUser, url: URL): Promise<Response> {
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') || '7')));
  const admin = isAdmin(user);
  const rows = await env.DB.prepare(
    `SELECT date(created_at) AS day, COUNT(*) AS requests, COALESCE(SUM(total_tokens),0) AS tokens, COALESCE(AVG(latency_ms),0) AS latency
     FROM usage_logs
     WHERE created_at >= datetime('now', ?) ${admin ? '' : 'AND user_id = ?'}
     GROUP BY date(created_at)
     ORDER BY day ASC`
  ).bind(`-${days} days`, ...(admin ? [] : [user.id])).all<any>();
  return json({ rows: rows.results || [] });
}

async function listApiKeys(env: Env, user: AuthedUser): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT id, name, key_prefix, status, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<any>();
  return json({ keys: rows.results || [] });
}

async function createApiKey(request: Request, env: Env, user: AuthedUser): Promise<Response> {
  const body = await readJson(request);
  const raw = `sk-relay-${randomToken(30)}`;
  const key = {
    id: id('key'),
    name: String(body.name || '默认密钥').slice(0, 64),
    prefix: raw.slice(0, 18),
    hash: await sha256(raw)
  };
  await env.DB.prepare(
    'INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)'
  ).bind(key.id, user.id, key.name, key.prefix, key.hash).run();
  return json({ key: { id: key.id, name: key.name, token: raw, key_prefix: key.prefix, status: 'active' } }, 201);
}

async function deleteApiKey(env: Env, user: AuthedUser, keyId: string): Promise<Response> {
  await env.DB.prepare('UPDATE api_keys SET status = "revoked" WHERE id = ? AND user_id = ?').bind(keyId, user.id).run();
  return json({ ok: true });
}

async function listModels(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT m.id, m.model_id, m.display_name, m.status, c.name AS channel_name FROM model_catalog m LEFT JOIN channels c ON c.id = m.channel_id WHERE m.status = "enabled" ORDER BY m.model_id ASC'
  ).all<any>();
  return json({ models: rows.results || [] });
}

async function getAdminSettings(env: Env): Promise<Response> {
  return json({ settings: await getSettings(env) });
}

async function updateAdminSettings(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const allowed = [
    'siteName',
    'appMode',
    'registrationEnabled',
    'captchaEnabled',
    'captchaSiteKey',
    'healthCheckIntervalMinutes',
    'workerUsageIntervalMinutes',
    'defaultChannelStrategy',
    'notifyWorkerUsage'
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  await saveSettings(env, updates);
  return json({ settings: await getSettings(env) });
}

async function listUsers(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT id, email, name, role, status, email_verified_at, created_at FROM users ORDER BY created_at DESC LIMIT 500'
  ).all<any>();
  return json({ users: rows.results || [] });
}

async function updateUser(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await readJson(request);
  const status = body.status === 'disabled' ? 'disabled' : 'active';
  const role = ['user', 'admin', 'super_admin'].includes(body.role) ? body.role : 'user';
  await env.DB.prepare('UPDATE users SET status = ?, role = ?, updated_at = ? WHERE id = ?')
    .bind(status, role, new Date().toISOString(), userId).run();
  return json({ ok: true });
}

async function listChannels(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT id, name, provider, base_url, priority, status, health_status, health_message, last_checked_at, created_at FROM channels ORDER BY priority ASC, created_at DESC'
  ).all<any>();
  return json({ channels: rows.results || [] });
}

async function createChannel(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  validateChannel(body);
  const channelId = id('chn');
  await env.DB.prepare(
    'INSERT INTO channels (id, name, provider, base_url, api_key, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(channelId, body.name, body.provider || 'openai-compatible', normalizeBaseUrl(body.base_url), body.api_key, Number(body.priority || 100), body.status || 'active').run();
  await refreshModelsForChannel(env, channelId);
  return json({ id: channelId }, 201);
}

async function updateChannel(request: Request, env: Env, channelId: string): Promise<Response> {
  const body = await readJson(request);
  validateChannel(body, true);
  await env.DB.prepare(
    'UPDATE channels SET name = ?, provider = ?, base_url = ?, api_key = ?, priority = ?, status = ?, updated_at = ? WHERE id = ?'
  ).bind(body.name, body.provider || 'openai-compatible', normalizeBaseUrl(body.base_url), body.api_key, Number(body.priority || 100), body.status || 'active', new Date().toISOString(), channelId).run();
  await refreshModelsForChannel(env, channelId);
  return json({ ok: true });
}

async function deleteChannel(env: Env, channelId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(channelId).run();
  return json({ ok: true });
}

async function listWorkerUsage(env: Env): Promise<Response> {
  const rows = await env.DB.prepare('SELECT * FROM worker_usage_snapshots ORDER BY created_at DESC LIMIT 48').all<any>();
  return json({ snapshots: rows.results || [] });
}

async function handleRelay(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const started = Date.now();
  const relayKey = await requireApiKey(request, env);
  const channel = await pickChannel(env);
  if (!channel) return json({ error: '没有可用渠道' }, 503);

  const url = new URL(request.url);
  const target = `${channel.base_url}${url.pathname.replace(/^\/v1/, '/v1')}${url.search}`;
  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${channel.api_key}`);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('x-forwarded-for');

  let model = '';
  let requestBody: BodyInit | null = null;
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    const text = await request.text();
    requestBody = text;
    try {
      model = JSON.parse(text).model || '';
    } catch {
      model = '';
    }
  }

  const upstreamResponse = await fetch(target, {
    method: request.method,
    headers,
    body: requestBody,
    redirect: 'manual'
  });
  const logResponse = upstreamResponse.clone();

  const response = new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: new Headers(upstreamResponse.headers)
  });
  response.headers.set('x-relay-channel', channel.name);
  ctx.waitUntil(logRelayUsage(env, {
    response: logResponse,
    relayKey,
    channelId: channel.id,
    method: request.method,
    path: url.pathname,
    status: upstreamResponse.status,
    model,
    latencyMs: Date.now() - started
  }));
  return response;
}

async function requireSession(request: Request, env: Env): Promise<AuthedUser> {
  const token = getBearerToken(request);
  if (!token) throw new HttpError('未登录', 401);
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.email_verified_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
  ).bind(hash).first<AuthedUser>();
  if (!row || row.status !== 'active') throw new HttpError('登录已过期', 401);
  return row;
}

async function requireApiKey(request: Request, env: Env): Promise<RelayKey> {
  const token = getBearerToken(request);
  if (!token) throw new HttpError('缺少 API Key', 401);
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND status = "active"').bind(hash).first<RelayKey>();
  if (!row) throw new HttpError('API Key 无效', 401);
  await env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
  return row;
}

async function pickChannel(env: Env): Promise<any | null> {
  return env.DB.prepare(
    `SELECT * FROM channels
     WHERE status = "active"
     ORDER BY CASE health_status WHEN 'ok' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, priority ASC, created_at ASC
     LIMIT 1`
  ).first<any>();
}

async function logRelayUsage(env: Env, input: {
  response: Response;
  relayKey: RelayKey;
  channelId: string;
  method: string;
  path: string;
  status: number;
  model: string;
  latencyMs: number;
}): Promise<void> {
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const type = input.response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      const payload = await input.response.json<any>();
      usage = payload.usage || usage;
    } catch {
      usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    }
  }
  await env.DB.prepare(
    `INSERT INTO usage_logs
      (id, user_id, api_key_id, channel_id, model, method, path, status, prompt_tokens, completion_tokens, total_tokens, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id('log'),
    input.relayKey.user_id,
    input.relayKey.id,
    input.channelId,
    input.model || '',
    input.method,
    input.path,
    input.status,
    Number(usage.prompt_tokens || 0),
    Number(usage.completion_tokens || 0),
    Number(usage.total_tokens || 0),
    input.latencyMs
  ).run();
}

async function runScheduledJobs(env: Env): Promise<void> {
  const settings = await getSettings(env);
  const jobs: Promise<unknown>[] = [];
  if (shouldRun(settings.lastHealthCheckAt, Number(settings.healthCheckIntervalMinutes || 60))) {
    jobs.push(checkChannelHealth(env));
  }
  if (shouldRun(settings.lastWorkerUsageCheckAt, Number(settings.workerUsageIntervalMinutes || 60))) {
    jobs.push(captureWorkerUsage(env));
  }
  await Promise.allSettled(jobs);
}

async function checkChannelHealth(env: Env): Promise<void> {
  const rows = await env.DB.prepare('SELECT * FROM channels WHERE status = "active" ORDER BY priority ASC LIMIT 50').all<any>();
  for (const channel of rows.results || []) {
    try {
      const res = await fetch(`${normalizeBaseUrl(channel.base_url)}/models`, {
        headers: { authorization: `Bearer ${channel.api_key}` },
        signal: AbortSignal.timeout(12000)
      });
      const ok = res.ok;
      await env.DB.prepare('UPDATE channels SET health_status = ?, health_message = ?, last_checked_at = ? WHERE id = ?')
        .bind(ok ? 'ok' : 'error', ok ? '模型接口可用' : `HTTP ${res.status}`, new Date().toISOString(), channel.id).run();
      if (ok) await refreshModelsForChannel(env, channel.id);
    } catch (error) {
      await env.DB.prepare('UPDATE channels SET health_status = "error", health_message = ?, last_checked_at = ? WHERE id = ?')
        .bind(getErrorMessage(error).slice(0, 200), new Date().toISOString(), channel.id).run();
    }
  }
  await saveSettings(env, { lastHealthCheckAt: new Date().toISOString() });
}

async function refreshModelsForChannel(env: Env, channelId: string): Promise<void> {
  const channel = await env.DB.prepare('SELECT * FROM channels WHERE id = ?').bind(channelId).first<any>();
  if (!channel) return;
  try {
    const res = await fetch(`${normalizeBaseUrl(channel.base_url)}/models`, {
      headers: { authorization: `Bearer ${channel.api_key}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return;
    const data = await res.json<any>();
    const models = Array.isArray(data.data) ? data.data : [];
    const statements = models.slice(0, 200).map((item: any) => {
      const modelId = String(item.id || item.model || '').trim();
      return env.DB.prepare(
        'INSERT OR IGNORE INTO model_catalog (id, channel_id, model_id, display_name, status) VALUES (?, ?, ?, ?, "enabled")'
      ).bind(id('mdl'), channelId, modelId, modelId);
    }).filter(Boolean);
    if (statements.length) await env.DB.batch(statements);
  } catch {
    // Health check will surface the failure; model sync is opportunistic.
  }
}

async function captureWorkerUsage(env: Env): Promise<void> {
  let snapshot = { requests: 0, errors: 0, cpu_time_ms: 0, period_start: '', period_end: '' };
  if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN) {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.CF_API_TOKEN}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          query: `query WorkerUsage($accountTag: string, $datetime_geq: Time, $datetime_leq: Time) {
            viewer {
              accounts(filter: { accountTag: $accountTag }) {
                workersInvocationsAdaptive(limit: 1000, filter: { datetime_geq: $datetime_geq, datetime_leq: $datetime_leq }) {
                  sum { requests errors cpuTime }
                }
              }
            }
          }`,
          variables: {
            accountTag: env.CF_ACCOUNT_ID,
            datetime_geq: start.toISOString(),
            datetime_leq: end.toISOString()
          }
        })
      });
      const data = await res.json<any>();
      const rows = data?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
      snapshot = rows.reduce((acc: typeof snapshot, row: any) => ({
        requests: acc.requests + Number(row.sum?.requests || 0),
        errors: acc.errors + Number(row.sum?.errors || 0),
        cpu_time_ms: acc.cpu_time_ms + Number(row.sum?.cpuTime || 0),
        period_start: start.toISOString(),
        period_end: end.toISOString()
      }), { requests: 0, errors: 0, cpu_time_ms: 0, period_start: start.toISOString(), period_end: end.toISOString() });
    } catch {
      snapshot = { requests: 0, errors: 0, cpu_time_ms: 0, period_start: '', period_end: '' };
    }
  }

  await env.DB.prepare(
    'INSERT INTO worker_usage_snapshots (id, requests, errors, cpu_time_ms, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id('wus'), snapshot.requests, snapshot.errors, snapshot.cpu_time_ms, snapshot.period_start, snapshot.period_end).run();
  await saveSettings(env, { lastWorkerUsageCheckAt: new Date().toISOString() });

  const settings = await getSettings(env);
  if (settings.notifyWorkerUsage === true) {
    await sendUsageNotifications(env, `Workers 用量：请求 ${snapshot.requests}，错误 ${snapshot.errors}，CPU ${Math.round(snapshot.cpu_time_ms)}ms`);
  }
}

async function sendUsageNotifications(env: Env, message: string): Promise<void> {
  const jobs: Promise<Response>[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    jobs.push(fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message })
    }));
  }
  if (env.WXPUSHER_APP_TOKEN && env.WXPUSHER_UIDS) {
    jobs.push(fetch('https://wxpusher.zjiecode.com/api/send/message', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        appToken: env.WXPUSHER_APP_TOKEN,
        content: message,
        summary: 'Workers 用量',
        contentType: 1,
        uids: env.WXPUSHER_UIDS.split(',').map((item) => item.trim()).filter(Boolean)
      })
    }));
  }
  await Promise.allSettled(jobs);
}

async function sendVerificationEmail(env: Env, email: string, token: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) return;
  const appBase = env.APP_ORIGIN || '';
  const verifyUrl = `${appBase.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: email,
      subject: '验证你的 API Relay 邮箱',
      html: `<p>点击下面的链接完成邮箱验证：</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>链接 24 小时内有效。</p>`
    })
  });
}

async function verifyCaptcha(token: string, env: Env): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) throw new HttpError('人机验证未配置密钥', 400);
  if (!token) throw new HttpError('请完成人机验证', 400);
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await res.json<any>();
  if (!data.success) throw new HttpError('人机验证失败', 400);
}

async function createSession(env: Env, userId: string): Promise<string> {
  const raw = `sess_${randomToken(32)}`;
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(id('ses'), userId, await sha256(raw), plusHours(24 * 30)).run();
  return raw;
}

async function hasSuperAdmin(env: Env): Promise<boolean> {
  const row = await env.DB.prepare('SELECT id FROM users WHERE role = "super_admin" LIMIT 1').first();
  return Boolean(row);
}

async function getSettings(env: Env): Promise<Record<string, any>> {
  const rows = await env.DB.prepare('SELECT key, value FROM system_settings').all<any>();
  const settings: Record<string, any> = {};
  for (const row of rows.results || []) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return { ...defaultPublicSettings, ...settings };
}

async function saveSettings(env: Env, settings: Record<string, unknown>): Promise<void> {
  const statements = Object.entries(settings).map(([key, value]) =>
    env.DB.prepare('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(key, JSON.stringify(value), new Date().toISOString())
  );
  if (statements.length) await env.DB.batch(statements);
}

function shouldRun(lastRun: unknown, intervalMinutes: number): boolean {
  if (!lastRun || typeof lastRun !== 'string') return true;
  const last = Date.parse(lastRun);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= Math.max(1, intervalMinutes) * 60 * 1000;
}

function cleanUser(user: AuthedUser): AuthedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    email_verified_at: user.email_verified_at
  };
}

function isAdmin(user: AuthedUser): boolean {
  return user.role === 'admin' || user.role === 'super_admin';
}

function validateChannel(body: any, _requireExisting = false): void {
  if (!body.name || !body.base_url || !body.api_key) throw new HttpError('渠道名称、Base URL 和 API Key 必填', 400);
  try {
    new URL(body.base_url);
  } catch {
    throw new HttpError('Base URL 格式不正确', 400);
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function getBearerToken(request: Request): string {
  const auth = request.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return '';
  return auth.slice(7).trim();
}

async function readJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw new HttpError('请求体必须是 JSON', 400);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function withCors(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', env.APP_ORIGIN || '*');
  headers.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('access-control-allow-headers', 'authorization,content-type');
  headers.set('access-control-max-age', '86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) throw new HttpError('邮箱格式不正确', 400);
}

function assertPassword(password: string): void {
  if (!password || password.length < 8) throw new HttpError('密码至少需要 8 位', 400);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const iterations = 100000;
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: toArrayBuffer(salt), iterations, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${iterations}$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, iterations, saltText, hashText] = stored.split('$');
  if (kind !== 'pbkdf2') return false;
  const salt = fromBase64url(saltText);
  const key = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: Number(iterations), hash: 'SHA-256' }, key, 256);
  return base64url(new Uint8Array(bits)) === hashText;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc(value));
  return base64url(new Uint8Array(digest));
}

function enc(value: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(value));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomToken(bytes = 24): string {
  const array = crypto.getRandomValues(new Uint8Array(bytes));
  return base64url(array);
}

function id(prefix: string): string {
  return `${prefix}_${randomToken(12)}`;
}

function plusHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpError) return error.message;
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
