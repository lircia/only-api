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
  TELEGRAM_PARSE_MODE?: string;
  TELEGRAM_MESSAGE_THREAD_ID?: string;
  TELEGRAM_DIRECT_MESSAGES_TOPIC_ID?: string;
  TELEGRAM_DISABLE_NOTIFICATION?: string;
  TELEGRAM_PROTECT_CONTENT?: string;
  TELEGRAM_LINK_PREVIEW_DISABLED?: string;
  WXPUSHER_APP_TOKEN?: string;
  WXPUSHER_UIDS?: string;
  WXPUSHER_TOPIC_IDS?: string;
  WXPUSHER_URL?: string;
  WXPUSHER_CONTENT_TYPE?: string;
  WXPUSHER_VERIFY_PAY_TYPE?: string;
}

type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  status: string;
  email_verified_at: string | null;
};

type GatewayKey = {
  id: string;
  user_id: string;
  key_hash: string;
  status: string;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8'
};

const defaultPublicSettings = {
  siteName: 'Only API',
  appMode: 'self',
  registrationEnabled: true,
  emailVerificationEnabled: false,
  captchaEnabled: false,
  captchaSiteKey: '',
  apiPublicBaseUrl: ''
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), env);

    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        return withCors(await handleApi(request, env, ctx), env);
      }

      if (isGatewayPath(url.pathname)) {
        return withCors(await handleGateway(request, env, ctx), env);
      }

      return withCors(json({ ok: true, service: 'only-api-worker' }), env);
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
  if (method === 'GET' && path === '/api/usage-summary') return getUsageSummary(env, user);
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
    await checkChannelHealth(env);
    return json({ ok: true, message: '检测成功' });
  }
  if (method === 'POST' && path.startsWith('/api/admin/channels/') && path.endsWith('/test')) {
    const channelId = path.split('/').at(-2) || '';
    return json(await checkSingleChannelHealth(env, channelId));
  }
  if (method === 'POST' && path === '/api/admin/worker-usage-check') {
    if (!hasWorkerUsageConfig(env)) return json({ error: '请配置 CF_ACCOUNT_ID 和 CF_API_TOKEN 变量' }, 400);
    await captureWorkerUsage(env);
    return json({ ok: true, message: '检测成功' });
  }
  if (method === 'GET' && path === '/api/admin/worker-usage') return listWorkerUsage(env);
  if (method === 'PATCH' && path.startsWith('/api/admin/models/')) return updateModel(request, env, path.split('/').pop() || '');
  if (method === 'DELETE' && path.startsWith('/api/admin/models/')) return deleteModel(env, path.split('/').pop() || '');
  if (method === 'POST' && path === '/api/admin/notify-test') return testNotification(request, env);

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
      emailVerificationEnabled: isEmailVerificationRequired(settings),
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
    siteName: body.siteName || 'Only API',
    appMode: body.appMode === 'multi' ? 'multi' : 'self',
    registrationEnabled: body.appMode === 'multi',
    emailVerificationEnabled: body.appMode === 'multi',
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

  const requireEmailVerification = isEmailVerificationRequired(settings);
  if (requireEmailVerification && (!env.RESEND_API_KEY || !env.RESEND_FROM)) {
    return json({ error: '多人配置需要先配置 Resend 邮件发送变量' }, 400);
  }

  const userId = id('usr');
  const passwordHash = await hashPassword(body.password);
  const verifiedAt = requireEmailVerification ? null : new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, status, email_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, body.email.toLowerCase(), body.name || body.email.split('@')[0], passwordHash, 'user', 'active', verifiedAt).run();

  if (!requireEmailVerification) {
    return json({ ok: true, message: '注册成功，可以直接登录' }, 201);
  }

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
  const settings = await getSettings(env);
  if (isEmailVerificationRequired(settings) && !user.email_verified_at) return json({ error: '请先完成邮箱验证' }, 403);
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

async function getUsageSummary(env: Env, user: AuthedUser): Promise<Response> {
  const admin = isAdmin(user);
  const ranges = [
    { key: '3h', label: '3 小时', since: '-3 hours' },
    { key: '1d', label: '1 日内', since: '-1 day' },
    { key: '7d', label: '7 日', since: '-7 days' },
    { key: '15d', label: '15 日', since: '-15 days' },
    { key: 'all', label: '总览', since: '' }
  ];
  const rows = [];
  for (const range of ranges) {
    const where = [
      ...(admin ? [] : ['user_id = ?']),
      ...(range.since ? ['created_at >= datetime(\'now\', ?)'] : [])
    ];
    const sql = `SELECT
        COUNT(*) AS requests,
        COALESCE(SUM(total_tokens),0) AS tokens,
        COALESCE(AVG(latency_ms),0) AS latency,
        COALESCE(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END),0) AS errors
      FROM usage_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
    const binds = [
      ...(admin ? [] : [user.id]),
      ...(range.since ? [range.since] : [])
    ];
    const stat = await env.DB.prepare(sql).bind(...binds).first<any>();
    const requests = Number(stat?.requests || 0);
    const errors = Number(stat?.errors || 0);
    rows.push({
      range: range.label,
      requests,
      tokens: Number(stat?.tokens || 0),
      latency: Math.round(Number(stat?.latency || 0)),
      errors,
      success_rate: requests ? `${Math.round(((requests - errors) / requests) * 100)}%` : '—'
    });
  }
  return json({ rows });
}

async function listApiKeys(env: Env, user: AuthedUser): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT id, name, key_prefix, status, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all<any>();
  return json({ keys: rows.results || [] });
}

async function createApiKey(request: Request, env: Env, user: AuthedUser): Promise<Response> {
  const body = await readJson(request);
  const raw = `oi-only-${randomToken(30)}`;
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
    'SELECT m.id, m.channel_id, m.model_id, m.display_name, m.status, c.name AS channel_name FROM model_catalog m LEFT JOIN channels c ON c.id = m.channel_id WHERE m.status = "enabled" ORDER BY COALESCE(NULLIF(m.display_name, ""), m.model_id) ASC'
  ).all<any>();
  return json({ models: rows.results || [] });
}

async function updateModel(request: Request, env: Env, modelRowId: string): Promise<Response> {
  const body = await readJson(request);
  const current = await env.DB.prepare('SELECT * FROM model_catalog WHERE id = ?').bind(modelRowId).first<any>();
  if (!current) return json({ error: '模型不存在' }, 404);
  const modelId = String(body.model_id ?? current.model_id ?? '').trim();
  const displayName = String(body.display_name ?? current.display_name ?? modelId).trim();
  const status = body.status === 'disabled' ? 'disabled' : 'enabled';
  if (!modelId) return json({ error: '模型名不能为空' }, 400);
  await env.DB.prepare('UPDATE model_catalog SET model_id = ?, display_name = ?, status = ? WHERE id = ?')
    .bind(modelId, displayName, status, modelRowId).run();
  return json({ ok: true, message: '模型已更新' });
}

async function deleteModel(env: Env, modelRowId: string): Promise<Response> {
  await env.DB.prepare('UPDATE model_catalog SET status = "disabled" WHERE id = ?').bind(modelRowId).run();
  return json({ ok: true, message: '模型已从广场隐藏' });
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
    'emailVerificationEnabled',
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
    `SELECT c.id, c.name, c.provider, c.base_url, c.priority, c.status, c.health_status, c.health_message, c.last_checked_at, c.created_at,
      GROUP_CONCAT(m.model_id, char(10)) AS models
     FROM channels c
     LEFT JOIN model_catalog m ON m.channel_id = c.id AND m.status = "enabled"
     GROUP BY c.id
     ORDER BY c.priority ASC, c.created_at DESC`
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
  if (parseModels(body.models).length) await saveChannelModels(env, channelId, body.models);
  return json({ id: channelId }, 201);
}

async function updateChannel(request: Request, env: Env, channelId: string): Promise<Response> {
  const body = await readJson(request);
  validateChannel(body, true);
  await env.DB.prepare(
    'UPDATE channels SET name = ?, provider = ?, base_url = ?, api_key = ?, priority = ?, status = ?, updated_at = ? WHERE id = ?'
  ).bind(body.name, body.provider || 'openai-compatible', normalizeBaseUrl(body.base_url), body.api_key, Number(body.priority || 100), body.status || 'active', new Date().toISOString(), channelId).run();
  if ('models' in body) await saveChannelModels(env, channelId, body.models);
  return json({ ok: true });
}

async function deleteChannel(env: Env, channelId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(channelId).run();
  return json({ ok: true });
}

async function updateChannelModels(request: Request, env: Env, channelId: string): Promise<Response> {
  const body = await readJson(request);
  await saveChannelModels(env, channelId, body.models);
  return json({ ok: true, models: parseModels(body.models) });
}

async function listWorkerUsage(env: Env): Promise<Response> {
  const rows = await env.DB.prepare('SELECT * FROM worker_usage_snapshots ORDER BY created_at DESC LIMIT 48').all<any>();
  return json({ configured: hasWorkerUsageConfig(env), snapshots: rows.results || [] });
}

async function handleGateway(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const started = Date.now();
  const gatewayKey = await requireApiKey(request, env);
  const url = new URL(request.url);
  if (isModelPath(url.pathname)) {
    return listGatewayModels(env);
  }

  let model = '';
  let requestBody: BodyInit | null = null;
  let parsedBody: any = null;
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    const text = await request.text();
    requestBody = text;
    try {
      parsedBody = JSON.parse(text);
      model = String(parsedBody.model || '');
    } catch {
      model = '';
    }
  }

  const channel = await pickChannel(env, model);
  if (!channel) return json({ error: '没有可用渠道' }, 503);

  if (model && parsedBody && channel.upstream_model_id && channel.upstream_model_id !== model) {
    parsedBody.model = channel.upstream_model_id;
    requestBody = JSON.stringify(parsedBody);
  }

  const target = buildUpstreamUrl(channel.base_url, url.pathname, url.search);
  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${channel.api_key}`);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('x-forwarded-for');
  if (requestBody !== null) headers.delete('content-length');

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
  response.headers.set('x-only-api-channel', channel.name);
  ctx.waitUntil(logGatewayUsage(env, {
    response: logResponse,
    gatewayKey,
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

async function requireApiKey(request: Request, env: Env): Promise<GatewayKey> {
  const token = getBearerToken(request);
  if (!token) throw new HttpError('缺少 API Key', 401);
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND status = "active"').bind(hash).first<GatewayKey>();
  if (!row) throw new HttpError('API Key 无效', 401);
  await env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
  return row;
}

async function pickChannel(env: Env, requestedModel = ''): Promise<any | null> {
  const model = requestedModel.trim();
  if (model) {
    const row = await env.DB.prepare(
      `SELECT c.*, m.model_id AS upstream_model_id
       FROM model_catalog m
       JOIN channels c ON c.id = m.channel_id
       WHERE m.status = "enabled"
         AND c.status = "active"
         AND (m.model_id = ? OR m.display_name = ?)
       ORDER BY CASE c.health_status WHEN 'ok' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, c.priority ASC, c.created_at ASC
       LIMIT 1`
    ).bind(model, model).first<any>();
    if (row) return row;
  }

  return env.DB.prepare(
    `SELECT * FROM channels
     WHERE status = "active"
     ORDER BY CASE health_status WHEN 'ok' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, priority ASC, created_at ASC
     LIMIT 1`
  ).first<any>();
}

async function logGatewayUsage(env: Env, input: {
  response: Response;
  gatewayKey: GatewayKey;
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
    input.gatewayKey.user_id,
    input.gatewayKey.id,
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
    await checkSingleChannelHealth(env, channel.id);
  }
  await saveSettings(env, { lastHealthCheckAt: new Date().toISOString() });
}

async function checkSingleChannelHealth(env: Env, channelId: string): Promise<Record<string, unknown>> {
  const channel = await env.DB.prepare('SELECT * FROM channels WHERE id = ?').bind(channelId).first<any>();
  if (!channel) throw new HttpError('渠道不存在', 404);
  try {
    const res = await fetch(buildUpstreamUrl(channel.base_url, '/v1/models'), {
      headers: { authorization: `Bearer ${channel.api_key}` },
      signal: AbortSignal.timeout(12000)
    });
    const ok = res.ok;
    await env.DB.prepare('UPDATE channels SET health_status = ?, health_message = ?, last_checked_at = ? WHERE id = ?')
      .bind(ok ? 'ok' : 'error', ok ? '模型接口可用' : `HTTP ${res.status}`, new Date().toISOString(), channel.id).run();
    const modelCount = ok ? await refreshModelsForChannel(env, channel.id) : 0;
    return {
      ok,
      status: res.status,
      modelCount,
      message: ok ? `渠道测试成功，已同步 ${modelCount} 个模型` : `渠道测试失败：HTTP ${res.status}`
    };
  } catch (error) {
    const message = getErrorMessage(error).slice(0, 200);
    await env.DB.prepare('UPDATE channels SET health_status = "error", health_message = ?, last_checked_at = ? WHERE id = ?')
      .bind(message, new Date().toISOString(), channel.id).run();
    return { ok: false, error: message, message: `渠道测试失败：${message}` };
  }
}

async function refreshModelsForChannel(env: Env, channelId: string): Promise<number> {
  const channel = await env.DB.prepare('SELECT * FROM channels WHERE id = ?').bind(channelId).first<any>();
  if (!channel) return 0;
  try {
    const res = await fetch(buildUpstreamUrl(channel.base_url, '/v1/models'), {
      headers: { authorization: `Bearer ${channel.api_key}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return 0;
    const data = await res.json<any>();
    const models = Array.isArray(data.data) ? data.data : [];
    const existingRows = await env.DB.prepare('SELECT id, model_id, display_name, status FROM model_catalog WHERE channel_id = ?').bind(channelId).all<any>();
    const existing = new Map<string, any>();
    for (const row of existingRows.results || []) {
      if (!existing.has(row.model_id)) existing.set(row.model_id, row);
    }
    const seen = new Set<string>();
    let visibleCount = 0;
    const statements = models.slice(0, 500).map((item: any) => {
      const modelId = String(item.id || item.model || '').trim();
      if (!modelId || seen.has(modelId)) return null;
      seen.add(modelId);
      const current = existing.get(modelId);
      if (current?.status === 'disabled') return null;
      visibleCount += 1;
      if (current) {
        return env.DB.prepare(
          'UPDATE model_catalog SET display_name = ?, status = "enabled" WHERE id = ?'
        ).bind(current.display_name || modelId, current.id);
      }
      return env.DB.prepare(
        'INSERT INTO model_catalog (id, channel_id, model_id, display_name, status) VALUES (?, ?, ?, ?, "enabled")'
      ).bind(id('mdl'), channelId, modelId, modelId);
    }).filter(Boolean);
    if (statements.length) await env.DB.batch(statements);
    return visibleCount;
  } catch {
    // Health check will surface the failure; model sync is opportunistic.
    return 0;
  }
}

async function saveChannelModels(env: Env, channelId: string, input: unknown): Promise<void> {
  const models = parseModels(input);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM model_catalog WHERE channel_id = ?').bind(channelId)
  ];
  for (const modelId of models) {
    statements.push(env.DB.prepare(
      'INSERT INTO model_catalog (id, channel_id, model_id, display_name, status) VALUES (?, ?, ?, ?, "enabled")'
    ).bind(id('mdl'), channelId, modelId, modelId));
  }
  await env.DB.batch(statements);
}

function parseModels(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.join('\n') : String(input || '');
  const seen = new Set<string>();
  return raw
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter((item) => item && !seen.has(item) && seen.add(item))
    .slice(0, 200);
}

async function listGatewayModels(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT COALESCE(NULLIF(m.display_name, ''), m.model_id) AS public_model_id, c.name AS channel_name
     FROM model_catalog m
     LEFT JOIN channels c ON c.id = m.channel_id
     WHERE m.status = "enabled"
     ORDER BY public_model_id ASC`
  ).all<any>();
  return json({
    object: 'list',
    data: (rows.results || []).map((row: any) => ({
      id: row.public_model_id,
      object: 'model',
      created: 0,
      owned_by: row.channel_name || 'only-api'
    }))
  });
}

async function captureWorkerUsage(env: Env): Promise<void> {
  if (!hasWorkerUsageConfig(env)) return;
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

function hasWorkerUsageConfig(env: Env): boolean {
  return Boolean(env.CF_ACCOUNT_ID && env.CF_API_TOKEN);
}

async function sendUsageNotifications(env: Env, message: string): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    jobs.push(sendTelegramMessage(env, { text: message }));
  }
  if (env.WXPUSHER_APP_TOKEN) {
    jobs.push(sendWxPusherMessage(env, {
      content: message,
      summary: 'Workers 用量'
    }));
  }
  await Promise.allSettled(jobs);
}

async function testNotification(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const type = body.type === 'wxpusher' ? 'wxpusher' : 'telegram';
  const message = `Only API 测试消息：${new Date().toISOString()}`;
  if (type === 'telegram') {
    await sendTelegramMessage(env, { text: message });
    return json({ ok: true, message: 'Telegram 测试成功' });
  }
  await sendWxPusherMessage(env, {
    content: message,
    summary: 'Only API 测试'
  });
  return json({ ok: true, message: 'WxPusher 测试成功' });
}

async function sendTelegramMessage(env: Env, input: { text: string }): Promise<any> {
  const payload = buildTelegramPayload(env, input.text);
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  let data: any = null;
  try {
    data = await res.json<any>();
  } catch {
    data = null;
  }
  if (!res.ok || data?.ok !== true) {
    throw new HttpError(`Telegram 推送失败：${data?.description || `HTTP ${res.status}`}`, 400);
  }
  return data;
}

function buildTelegramPayload(env: Env, text: string): Record<string, unknown> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new HttpError('请配置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 变量', 400);
  const payload: Record<string, unknown> = {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: truncateTelegramText(text)
  };
  const parseMode = normalizeTelegramParseMode(env.TELEGRAM_PARSE_MODE);
  if (parseMode) payload.parse_mode = parseMode;
  const threadId = parseInteger(env.TELEGRAM_MESSAGE_THREAD_ID);
  if (threadId !== undefined) payload.message_thread_id = threadId;
  const directTopicId = parseInteger(env.TELEGRAM_DIRECT_MESSAGES_TOPIC_ID);
  if (directTopicId !== undefined) payload.direct_messages_topic_id = directTopicId;
  const disableNotification = parseBooleanFlag(env.TELEGRAM_DISABLE_NOTIFICATION);
  if (disableNotification !== undefined) payload.disable_notification = disableNotification;
  const protectContent = parseBooleanFlag(env.TELEGRAM_PROTECT_CONTENT);
  if (protectContent !== undefined) payload.protect_content = protectContent;
  const linkPreviewDisabled = parseBooleanFlag(env.TELEGRAM_LINK_PREVIEW_DISABLED);
  if (linkPreviewDisabled !== undefined) payload.link_preview_options = { is_disabled: linkPreviewDisabled };
  return payload;
}

function normalizeTelegramParseMode(value: string | undefined): string {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'html') return 'HTML';
  if (normalized === 'markdownv2') return 'MarkdownV2';
  if (normalized === 'markdown') return 'Markdown';
  return '';
}

function truncateTelegramText(value: string): string {
  const chars = Array.from(value);
  return chars.length > 4096 ? `${chars.slice(0, 4093).join('')}...` : value;
}

async function sendWxPusherMessage(env: Env, input: { content: string; summary: string; url?: string }): Promise<any> {
  const payload = buildWxPusherPayload(env, input);
  const res = await fetch('https://wxpusher.zjiecode.com/api/send/message', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  let data: any = null;
  try {
    data = await res.json<any>();
  } catch {
    data = null;
  }
  if (!res.ok) throw new HttpError(`WxPusher 推送失败：HTTP ${res.status}`, 400);
  if (data?.code !== 1000 || data?.success === false) {
    throw new HttpError(`WxPusher 推送失败：${data?.msg || '返回码不是 1000'}`, 400);
  }
  const failedTargets = Array.isArray(data?.data) ? data.data.filter((item: any) => item?.code !== 1000) : [];
  if (failedTargets.length) {
    const detail = failedTargets.map((item: any) => item?.status || item?.msg || item?.code).join('；');
    throw new HttpError(`WxPusher 部分目标失败：${detail || '请检查 UID 或 Topic ID'}`, 400);
  }
  return data;
}

function buildWxPusherPayload(env: Env, input: { content: string; summary: string; url?: string }): Record<string, unknown> {
  if (!env.WXPUSHER_APP_TOKEN) throw new HttpError('请配置 WXPUSHER_APP_TOKEN 变量', 400);
  const uids = parseStringList(env.WXPUSHER_UIDS);
  const topicIds = parseNumberList(env.WXPUSHER_TOPIC_IDS);
  if (!uids.length && !topicIds.length) throw new HttpError('请配置 WXPUSHER_UIDS 或 WXPUSHER_TOPIC_IDS 变量', 400);

  const payload: Record<string, unknown> = {
    appToken: env.WXPUSHER_APP_TOKEN,
    content: input.content,
    summary: input.summary.slice(0, 100),
    contentType: normalizeWxPusherContentType(env.WXPUSHER_CONTENT_TYPE)
  };
  if (uids.length) payload.uids = uids;
  if (topicIds.length) payload.topicIds = topicIds;
  const url = (input.url || env.WXPUSHER_URL || '').trim();
  if (url) payload.url = url;
  const verifyPayType = normalizeWxPusherVerifyPayType(env.WXPUSHER_VERIFY_PAY_TYPE);
  if (verifyPayType !== undefined) payload.verifyPayType = verifyPayType;
  return payload;
}

function parseStringList(value: string | undefined): string[] {
  return String(value || '')
    .split(/[,\n;，；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberList(value: string | undefined): number[] {
  return parseStringList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function parseInteger(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseBooleanFlag(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function normalizeWxPusherContentType(value: string | undefined): number {
  const contentType = Number(value || 1);
  return [1, 2, 3].includes(contentType) ? contentType : 1;
}

function normalizeWxPusherVerifyPayType(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const verifyPayType = Number(value);
  return [0, 1, 2].includes(verifyPayType) ? verifyPayType : 0;
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
      subject: '验证你的 Only API 邮箱',
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
  const merged = { ...defaultPublicSettings, ...settings };
  if (!Object.prototype.hasOwnProperty.call(settings, 'emailVerificationEnabled')) {
    merged.emailVerificationEnabled = merged.appMode === 'multi';
  }
  return merged;
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

function isEmailVerificationRequired(settings: Record<string, any>): boolean {
  if (typeof settings.emailVerificationEnabled === 'boolean') return settings.emailVerificationEnabled;
  return settings.appMode === 'multi';
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
  const url = new URL(value.trim());
  url.pathname = url.pathname
    .replace(/\/+$/, '')
    .replace(/\/v1\/chat\/completions$/i, '/v1')
    .replace(/\/v1\/chat$/i, '/v1')
    .replace(/\/v1$/i, '/v1');
  return url.toString().replace(/\/+$/, '');
}

function buildUpstreamUrl(baseUrl: string, apiPath: string, search = ''): string {
  const base = normalizeBaseUrl(baseUrl);
  if (base.match(/\/v1$/i)) {
    const suffix = apiPath.replace(/^\/v1/, '') || '';
    return `${base}${suffix}${search}`;
  }
  return `${base}${apiPath}${search}`;
}

function isGatewayPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return path.startsWith('/v1/') || isModelPath(path);
}

function isModelPath(pathname: string): boolean {
  return pathname.toLowerCase().includes('/model');
}

function getBearerToken(request: Request): string {
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const lowerAuth = auth.toLowerCase();
  const legacyPrefix = `sk-${'rel'}${'ay'}-`;
  if ([legacyPrefix, 'sk-only-', 'oi-only-'].some((prefix) => lowerAuth.startsWith(prefix))) return auth.trim();
  return request.headers.get('x-api-key')?.trim()
    || request.headers.get('api-key')?.trim()
    || '';
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
  headers.set('access-control-allow-headers', 'authorization,content-type,x-api-key,api-key');
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
