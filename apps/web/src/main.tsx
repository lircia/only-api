import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Copy,
  Gauge,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings,
  Shield,
  Trash2,
  Users
} from 'lucide-react';
import './styles.css';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  status: string;
  email_verified_at: string | null;
};

type SettingsShape = {
  siteName: string;
  appMode: 'self' | 'multi';
  registrationEnabled: boolean;
  emailVerificationEnabled: boolean;
  captchaEnabled: boolean;
  captchaSiteKey: string;
  healthCheckIntervalMinutes: number;
  workerUsageIntervalMinutes: number;
  defaultChannelStrategy: string;
  notifyWorkerUsage: boolean;
  apiPublicBaseUrl?: string;
  themeName: string;
  backgroundImageUrl: string;
  emailDomainValidationEnabled: boolean;
  qqEmailNumericPrefixRequired: boolean;
  frontendUmamiEnabled: boolean;
  frontendUmamiScriptUrl: string;
  frontendUmamiWebsiteId: string;
  frontendUmamiHostUrl: string;
  backendUmamiEnabled: boolean;
  backendUmamiHostUrl: string;
  backendUmamiWebsiteId: string;
  backendUmamiHostname: string;
};

type NavKey = 'dashboard' | 'keys' | 'usage' | 'models' | 'settings' | 'users' | 'channels' | 'workerUsage';

const tokenStoreKey = 'only-api-token';
function readSavedToken() {
  return localStorage.getItem(tokenStoreKey) || sessionStorage.getItem(tokenStoreKey) || '';
}

function saveSessionToken(token: string) {
  localStorage.setItem(tokenStoreKey, token);
  sessionStorage.setItem(tokenStoreKey, token);
}

function clearSessionToken() {
  localStorage.removeItem(tokenStoreKey);
  sessionStorage.removeItem(tokenStoreKey);
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
const fallbackBackgroundImageUrl = (import.meta.env.VITE_BACKGROUND_IMAGE_URL || '').trim();
const fallbackUmamiScriptUrl = (import.meta.env.VITE_UMAMI_SCRIPT_URL || '').trim();
const fallbackUmamiWebsiteId = (import.meta.env.VITE_UMAMI_WEBSITE_ID || '').trim();
const fallbackUmamiHostUrl = (import.meta.env.VITE_UMAMI_HOST_URL || '').trim();
const defaultSettings: SettingsShape = {
  siteName: 'Only API',
  appMode: 'self',
  registrationEnabled: false,
  emailVerificationEnabled: false,
  captchaEnabled: false,
  captchaSiteKey: '',
  healthCheckIntervalMinutes: 60,
  workerUsageIntervalMinutes: 360,
  defaultChannelStrategy: 'priority',
  notifyWorkerUsage: false,
  themeName: 'black-white',
  backgroundImageUrl: '',
  emailDomainValidationEnabled: false,
  qqEmailNumericPrefixRequired: false,
  frontendUmamiEnabled: false,
  frontendUmamiScriptUrl: '',
  frontendUmamiWebsiteId: '',
  frontendUmamiHostUrl: '',
  backendUmamiEnabled: false,
  backendUmamiHostUrl: '',
  backendUmamiWebsiteId: '',
  backendUmamiHostname: ''
};

const themeOptions = [
  { key: 'black-white', label: '黑白', colors: ['#111111', '#ffffff', '#eeeeee', '#222222'] },
  { key: 'blue-white', label: '蓝白', colors: ['#7dd3fc', '#ffffff', '#e0f7ff', '#0891b2'] },
  { key: 'yellow-purple', label: '黄紫', colors: ['#fff200', '#7c3aed', '#7c3aed', '#fff200'] },
  { key: 'green-red', label: '绿红', colors: ['#dffbea', '#b00020', '#ffffff', '#8b0000'] },
  { key: 'pink-orange', label: '粉橙', colors: ['#fed7aa', '#fff7fa', '#fb923c', '#ffe4ec'] }
];

function App() {
  const [token, setToken] = useState(readSavedToken);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SettingsShape>(defaultSettings);
  const [setupRequired, setSetupRequired] = useState(false);
  const [active, setActive] = useState<NavKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const [notice, setNotice] = useState('');
  const [umamiReady, setUmamiReady] = useState(false);

  const api = useMemo(() => makeApi(token, setNotice), [token]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.themeName || 'black-white';
  }, [settings.themeName]);

  useEffect(() => {
    const raw = (settings.backgroundImageUrl || fallbackBackgroundImageUrl || '').trim();
    if (!raw) {
      document.documentElement.style.setProperty('--app-bg-image', 'none');
      document.documentElement.dataset.hasBgImage = 'false';
      return;
    }
    const safeUrl = raw.replace(/["\\\n\r]/g, '');
    document.documentElement.style.setProperty('--app-bg-image', `url("${safeUrl}")`);
    document.documentElement.dataset.hasBgImage = 'true';
  }, [settings.backgroundImageUrl]);

  useEffect(() => {
    const websiteId = (settings.frontendUmamiWebsiteId || fallbackUmamiWebsiteId).trim();
    const scriptUrl = (settings.frontendUmamiScriptUrl || fallbackUmamiScriptUrl || (websiteId ? 'https://cloud.umami.is/script.js' : '')).trim();
    const hostUrl = (settings.frontendUmamiHostUrl || fallbackUmamiHostUrl).trim();
    const enabled = settings.frontendUmamiEnabled || Boolean(fallbackUmamiWebsiteId);
    const oldScript = document.querySelector('script[data-only-api-umami]');
    oldScript?.remove();
    setUmamiReady(false);

    if (!enabled || !websiteId || !scriptUrl) return;

    let mounted = true;
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = scriptUrl;
    script.setAttribute('data-only-api-umami', 'true');
    script.setAttribute('data-website-id', websiteId);
    if (hostUrl) script.setAttribute('data-host-url', hostUrl);
    script.addEventListener('load', () => {
      if (mounted) setUmamiReady(Boolean((window as any).umami?.track));
    });
    document.head.appendChild(script);

    return () => {
      mounted = false;
      script.remove();
    };
  }, [settings.frontendUmamiEnabled, settings.frontendUmamiScriptUrl, settings.frontendUmamiWebsiteId, settings.frontendUmamiHostUrl]);

  useEffect(() => {
    const tracker = (window as any).umami;
    if (umamiReady && tracker?.track && (settings.frontendUmamiEnabled || Boolean(fallbackUmamiWebsiteId))) {
      tracker.track('console_view', { page: active });
    }
  }, [active, settings.frontendUmamiEnabled, umamiReady]);

  async function refreshBootstrap() {
    const data = await api.get('/api/public/bootstrap', false);
    if (typeof data.setupRequired !== 'boolean' || !data.settings) {
      throw new Error('前端没有拿到后端初始化信息，请检查 Pages 的 VITE_API_BASE_URL 是否指向 Worker 域名');
    }
    setSetupRequired(data.setupRequired);
    setSettings({ ...defaultSettings, ...data.settings });
  }

  async function refreshMe() {
    if (!token) return;
    try {
      const data = await api.get('/api/me');
      setUser(data.user);
    } catch {
      clearSessionToken();
      setToken('');
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setBootError('');
        await refreshBootstrap();
        await refreshMe();
      } catch (error) {
        setBootError(error instanceof Error ? error.message : '控制台初始化失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function acceptSession(nextToken: string, nextUser: User) {
    saveSessionToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setSetupRequired(false);
    setActive('dashboard');
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout', {});
    } finally {
      clearSessionToken();
      setToken('');
      setUser(null);
    }
  }

  const admin = user?.role === 'admin' || user?.role === 'super_admin';

  if (loading) return <Shell title="加载中"><div className="centerPanel"><RefreshCw className="spin" />正在准备控制台</div></Shell>;
  if (bootError) return <Shell title="连接失败"><BootError message={bootError} /></Shell>;
  if (setupRequired) return <Shell title="初始化"><Setup settings={settings} api={api} onDone={acceptSession} /></Shell>;
  if (!user) return <Shell title={settings.siteName}><Auth settings={settings} api={api} onLogin={acceptSession} /></Shell>;

  const nav: Array<{ key: NavKey; label: string; icon: React.ReactNode; admin?: boolean }> = [
    { key: 'dashboard', label: '总览', icon: <Gauge /> },
    { key: 'keys', label: 'API Key', icon: <KeyRound /> },
    { key: 'usage', label: '用量', icon: <BarChart3 /> },
    { key: 'models', label: '模型广场', icon: <Server /> },
    { key: 'settings', label: '系统设置', icon: <Settings />, admin: true },
    { key: 'users', label: '用户设置', icon: <Users />, admin: true },
    { key: 'channels', label: '渠道设置', icon: <Activity />, admin: true },
    { key: 'workerUsage', label: 'Workers 用量', icon: <Shield />, admin: true }
  ];

  const publicApiBase = settings.apiPublicBaseUrl || apiBaseUrl || location.origin;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">OA</div>
          <div>
            <strong>{settings.siteName}</strong>
            <span>API 中转控制台</span>
          </div>
        </div>
        <nav>
          {nav.filter((item) => !item.admin || admin).map((item) => (
            <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => setActive(item.key)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="ghostBtn logout" onClick={logout}><LogOut />退出</button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <h1>{pageTitle(active)}</h1>
            <p>{user.name || user.email} · {roleText(user.role)}</p>
          </div>
          {notice && <div className="notice">{notice}</div>}
        </header>
        {active === 'dashboard' && <Dashboard api={api} />}
        {active === 'keys' && <ApiKeys api={api} publicBase={publicApiBase} />}
        {active === 'usage' && <Usage api={api} />}
        {active === 'models' && <Models api={api} admin={admin} />}
        {active === 'settings' && admin && <AdminSettings api={api} settings={settings} onSaved={(next) => setSettings({ ...settings, ...next })} />}
        {active === 'users' && admin && <UsersPage api={api} />}
        {active === 'channels' && admin && <Channels api={api} />}
        {active === 'workerUsage' && admin && <WorkerUsage api={api} />}
      </main>
    </div>
  );
}

function BootError({ message }: { message: string }) {
  return (
    <div className="panel narrow">
      <h2>前端没有连上后端</h2>
      <p>{message}</p>
      <div className="checkList">
        <span>检查 Pages 环境变量 `VITE_API_BASE_URL` 是否填写为 Worker 域名。</span>
        <span>修改 Pages 环境变量后，需要重新部署 Pages。</span>
        <span>检查 Worker 是否已经绑定 D1：变量名 `DB`，数据库推荐使用 `only_api`。</span>
        <span>检查 Worker 变量 `APP_ORIGIN` 是否填写为 Pages 域名。</span>
      </div>
      <button className="primaryBtn" onClick={() => location.reload()}><RefreshCw />重新加载</button>
    </div>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="authShell">
      <section>
        <div className="brand large">
          <div className="brandMark">OA</div>
          <div>
            <strong>{title}</strong>
            <span>Cloudflare Workers and Pages API gateway</span>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function Setup({ settings, api, onDone }: { settings: SettingsShape; api: ApiClient; onDone: (token: string, user: User) => void }) {
  const [form, setForm] = useState({ secret: '', email: '', name: 'Super Admin', password: '', siteName: settings.siteName });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.post('/api/setup', form, false);
      onDone(data.token, data.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '初始化失败，请检查 Worker 变量和 D1 绑定');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h2>创建超级管理员</h2>
      <p>首次访问需要管理员密钥。创建成功并完成基础配置后，这个入口会自动关闭。</p>
      <Input label="管理员密钥" type="password" value={form.secret} onChange={(secret) => setForm({ ...form, secret })} />
      <Input label="邮箱" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
      <Input label="名称" value={form.name} onChange={(name) => setForm({ ...form, name })} />
      <Input label="密码" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
      <Input label="站点名称" value={form.siteName} onChange={(siteName) => setForm({ ...form, siteName })} />
      <p className="hintText">密码至少 8 位，管理员密钥必须和 Worker 变量 `ADMIN_SETUP_SECRET` 完全一致。</p>
      {error && <p className="errorText">{error}</p>}
      <button className="primaryBtn" disabled={busy}><Shield />{busy ? '正在初始化' : '完成初始化'}</button>
    </form>
  );
}

function Auth({ settings, api, onLogin }: { settings: SettingsShape; api: ApiClient; onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [form, setForm] = useState({ email: '', name: '', password: '', confirmPassword: '' });
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const captchaToken = useTurnstile(settings.captchaEnabled && mode === 'register' ? turnstileSiteKey : '');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const data = await api.post('/api/auth/login', form, false);
        onLogin(data.token, data.user);
        return;
      }
      if (mode === 'verify') {
        const data = await api.post('/api/auth/verify-code', { email: verificationEmail, code: verificationCode }, false);
        setMode('login');
        setVerificationCode('');
        setMessage(data.message || '邮箱已验证，可以登录');
        return;
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }
      const data = await api.post('/api/auth/register', { ...form, captchaToken: captchaToken.token }, false);
      if (data.pendingVerification) {
        setVerificationEmail(data.email || form.email);
        setVerificationCode('');
        setResendCooldown(67);
        setMode('verify');
        setMessage(data.message || '验证码已发送，请检查邮箱');
        return;
      }
      setMessage(data.message || '注册成功，可以直接登录');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '请求失败');
      if (mode === 'verify') setResendCooldown(67);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await api.post('/api/auth/resend-code', { email: verificationEmail }, false);
      setResendCooldown(Number(data.resendAfterSeconds || 67));
      setMessage(data.message || '验证码已重新发送');
    } catch (resendError: any) {
      setError(resendError instanceof Error ? resendError.message : '验证码重发失败');
      setResendCooldown(67);
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'verify') {
    return (
      <form className="panel narrow" onSubmit={submit}>
        <h2>输入邮箱验证码</h2>
        <p>验证码已发送到 {verificationEmail}，13 分钟内有效，最多可输入 3 次。</p>
        <Input label="13 位数字验证码" value={verificationCode} onChange={(code) => setVerificationCode(code.replace(/\D/g, '').slice(0, 13))} />
        {error && <p className="errorText">{error}</p>}
        {message && <p className="successText">{message}</p>}
        <button className="primaryBtn" disabled={busy || verificationCode.length !== 13}><CheckCircle2 />{busy ? '请稍候' : '完成验证'}</button>
        <div className="rowActions left">
          <button type="button" className="smallBtn" onClick={resendCode} disabled={busy || resendCooldown > 0}>
            {resendCooldown > 0 ? `${resendCooldown} 秒后可重发` : '没收到？重新发送'}
          </button>
          <button type="button" className="smallBtn" onClick={() => setMode('login')}>返回登录</button>
        </div>
      </form>
    );
  }

  return (
    <form className="panel narrow" onSubmit={submit}>
      <div className="tabs">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button>
        {settings.registrationEnabled && <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button>}
      </div>
      {mode === 'register' && <Input label="名称" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
      <Input label="邮箱" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
      <Input label="密码" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
      {mode === 'register' && <Input label="确认密码" type="password" value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} />}
      {settings.captchaEnabled && mode === 'register' && <div className="turnstile" ref={captchaToken.ref}>{turnstileSiteKey ? '' : '未配置 Pages 变量 VITE_TURNSTILE_SITE_KEY'}</div>}
      {error && <p className="errorText">{error}</p>}
      <button className="primaryBtn" disabled={busy}>{mode === 'login' ? <LogOut /> : <CheckCircle2 />}{busy ? '请稍候' : mode === 'login' ? '登录' : '创建账号'}</button>
      {message && <p className="successText">{message}</p>}
    </form>
  );
}

function Dashboard({ api }: { api: ApiClient }) {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  async function load() {
    setRefreshing(true);
    try {
      const next = await api.get('/api/dashboard');
      setData(next);
    } finally {
      setRefreshing(false);
    }
  }
  useLoad(load, []);
  if (!data) return <LoadingPanel />;
  const cards = [
    ['总请求', data.totals?.requests || 0],
    ['今日请求', data.today?.requests || 0],
    ['总 Token', data.totals?.tokens || 0],
    ['平均延迟', `${Math.round(data.totals?.latency || 0)} ms`],
    ['有效密钥', data.keys?.count || 0],
    ['健康渠道', `${data.channels?.healthy || 0}/${data.channels?.count || 0}`]
  ];
  return (
    <section className="content">
      <div className="toolbar compact"><h2>状态</h2><button className="smallBtn" onClick={load} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} />{refreshing ? '刷新中' : '刷新'}</button></div>
      <div className="metricGrid">{cards.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
      <div className="panel">
        <h2>最近请求</h2>
        <DataTable rows={data.recent || []} columns={['created_at', 'path', 'model', 'status', 'total_tokens', 'latency_ms']} />
      </div>
    </section>
  );
}

function ApiKeys({ api, publicBase }: { api: ApiClient; publicBase: string }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [visibleTokens, setVisibleTokens] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('only-api-visible-keys') || '{}');
    } catch {
      return {};
    }
  });
  async function load() {
    const data = await api.get('/api/api-keys');
    setKeys(data.keys);
  }
  useLoad(load, []);
  function rememberToken(id: string, token: string) {
    const next = { ...visibleTokens, [id]: token };
    setVisibleTokens(next);
    localStorage.setItem('only-api-visible-keys', JSON.stringify(next));
  }
  async function create() {
    const name = prompt('密钥名称', '默认密钥') || '默认密钥';
    const data = await api.post('/api/api-keys', { name });
    rememberToken(data.key.id, data.key.token);
    await load();
  }
  async function revoke(id: string) {
    if (!confirm('确定删除这个 API Key？删除后该 Key 将无法继续使用。')) return;
    await api.delete(`/api/api-keys/${id}`);
    const next = { ...visibleTokens };
    delete next[id];
    setVisibleTokens(next);
    localStorage.setItem('only-api-visible-keys', JSON.stringify(next));
    await load();
  }
  return (
    <section className="content">
      <div className="toolbar">
        <div>
          <h2>API Key</h2>
          <p>中转地址：<code>{publicBase.replace(/\/$/, '')}/v1</code></p>
        </div>
        <button className="primaryBtn" onClick={create}><Plus />新建</button>
      </div>
      <div className="panel">
        {keys.length ? keys.map((row) => {
          const token = row.token || visibleTokens[row.id] || '';
          const shown = token || `${row.key_prefix}...`;
          return (
            <div className="keyRow" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <code>{shown}</code>
                <span>{row.last_used_at ? `最近使用：${formatCell(row.last_used_at)}` : `创建：${formatCell(row.created_at)}`}</span>
              </div>
              <div className="rowActions">
                <button className="iconBtn" onClick={() => navigator.clipboard.writeText(token || row.key_prefix)} title="复制"><Copy /></button>
                <button className="iconBtn danger" onClick={() => revoke(row.id)} title="删除"><Trash2 /></button>
              </div>
            </div>
          );
        }) : <div className="empty">暂无 API Key</div>}
      </div>
    </section>
  );
}

function Usage({ api }: { api: ApiClient }) {
  const [rows, setRows] = useState<any[]>([]);
  const [modelRows, setModelRows] = useState<any[]>([]);
  const [apiKeyRows, setApiKeyRows] = useState<any[]>([]);
  const [userRows, setUserRows] = useState<any[]>([]);
  const [hourlyRows, setHourlyRows] = useState<any[]>([]);
  const [statusRows, setStatusRows] = useState<any[]>([]);
  useLoad(() => api.get('/api/usage-summary').then((data) => {
    setRows(data.rows || []);
    setModelRows(data.modelRows || []);
    setApiKeyRows(data.apiKeyRows || []);
    setUserRows(data.userRows || []);
    setHourlyRows(data.hourlyRows || []);
    setStatusRows(data.statusRows || []);
  }), []);
  return (
    <section className="content">
      <div className="usageGrid">
        <div className="panel">
          <h2>24 小时请求趋势</h2>
          <BarList rows={hourlyRows} labelKey="hour" valueKey="requests" />
        </div>
        <div className="panel">
          <h2>模型 Token 分布</h2>
          <BarList rows={modelRows.slice(0, 10)} labelKey="model" valueKey="tokens" />
        </div>
        <div className="panel">
          <h2>状态码分布</h2>
          <StatusBlocks rows={statusRows} />
        </div>
      </div>
      <div className="panel">
        <h2>用量统计表</h2>
        <DataTable rows={rows} columns={['range', 'requests', 'tokens', 'latency', 'errors', 'success_rate']} />
      </div>
      <div className="panel">
        <h2>模型用量表</h2>
        <DataTable rows={modelRows} columns={['model', 'requests', 'tokens', 'latency', 'errors', 'success_rate']} />
      </div>
      <div className="panel">
        <h2>API Key 用量表</h2>
        <DataTable rows={apiKeyRows} columns={['api_key_name', 'user_email', 'user_name', 'requests', 'tokens', 'latency', 'errors', 'success_rate']} />
      </div>
      <div className="panel">
        <h2>用户用量表</h2>
        <DataTable rows={userRows} columns={['user_email', 'user_name', 'requests', 'tokens', 'latency', 'errors', 'success_rate']} />
      </div>
    </section>
  );
}

function BarList({ rows, labelKey, valueKey }: { rows: any[]; labelKey: string; valueKey: string }) {
  if (!rows.length) return <div className="empty compact">暂无数据</div>;
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div className="barList">
      {rows.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        return (
          <div className="barItem" key={`${row[labelKey]}-${index}`}>
            <span title={String(row[labelKey])}>{formatCell(row[labelKey])}</span>
            <div><i style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div>
            <strong>{value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function StatusBlocks({ rows }: { rows: any[] }) {
  if (!rows.length) return <div className="empty compact">暂无数据</div>;
  const total = rows.reduce((sum, row) => sum + Number(row.requests || 0), 0) || 1;
  return (
    <div className="statusBlocks">
      {rows.map((row) => {
        const status = Number(row.status || 0);
        const requests = Number(row.requests || 0);
        return (
          <div className={status >= 400 ? 'statusBlock error' : 'statusBlock ok'} key={row.status}>
            <span>{row.status}</span>
            <strong>{requests}</strong>
            <i>{Math.round((requests / total) * 100)}%</i>
          </div>
        );
      })}
    </div>
  );
}

function Models({ api, admin }: { api: ApiClient; admin: boolean }) {
  const [models, setModels] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [batch, setBatch] = useState({ channel_id: '', models: '', action: 'add' });
  const [cleaning, setCleaning] = useState(false);
  async function load() {
    const data = await api.get('/api/models');
    const rows = data.models || [];
    setModels(rows);
    setChannels(data.channels || []);
    setDrafts(Object.fromEntries(rows.map((model: any) => [model.id, model.display_name || model.model_id])));
  }
  useLoad(load, []);
  async function saveModel(model: any) {
    const displayName = (drafts[model.id] || '').trim();
    if (!displayName) return;
    await api.patch(`/api/admin/models/${model.id}`, { display_name: displayName, status: 'enabled' });
    await load();
  }
  async function removeModel(model: any) {
    await api.delete(`/api/admin/models/${model.id}`);
    await load();
  }
  async function applyBatch() {
    if (!batch.channel_id || !batch.models.trim()) return;
    const deleteAll = batch.action === 'delete'
      && batch.models.split(/[\s,]+/).some((model) => model.toLowerCase() === '-all');
    if (deleteAll) {
      const channelName = channels.find((channel) => channel.id === batch.channel_id)?.name || '当前渠道';
      if (!window.confirm(`确定隐藏“${channelName}”的全部模型吗？`)) return;
    }
    await api.post('/api/admin/models/batch', batch);
    setBatch({ ...batch, models: '' });
    await load();
  }
  async function cleanupOrphans() {
    setCleaning(true);
    try {
      await api.post('/api/admin/models/cleanup-orphans', {});
      await load();
    } finally {
      setCleaning(false);
    }
  }
  const grouped = models.reduce<Record<string, any[]>>((acc, model) => {
    const key = Number(model.is_orphan || 0) === 1 ? '已删除渠道残留模型' : (model.channel_name || '未命名渠道');
    acc[key] = acc[key] || [];
    acc[key].push(model);
    return acc;
  }, {});
  const orphanCount = models.filter((model) => Number(model.is_orphan || 0) === 1).length;
  return (
    <section className="content">
      <div className="panel">
        <div className="toolbar compact">
          <h2>模型广场</h2>
          {admin && orphanCount > 0 && (
            <button className="smallBtn dangerBtn" onClick={cleanupOrphans} disabled={cleaning}>
              <Trash2 />{cleaning ? '清理中' : `清理残留模型 ${orphanCount}`}
            </button>
          )}
        </div>
        <p>渠道测试成功后会自动从上游 `/models` 同步模型。这里显示的模型名会返回给 SillyTavern；如需别名，可直接修改显示名。</p>
        {admin && (
          <div className="batchBox">
            <select value={batch.channel_id} onChange={(event) => setBatch({ ...batch, channel_id: event.target.value })}>
              <option value="">选择渠道</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
            </select>
            <select value={batch.action} onChange={(event) => setBatch({ ...batch, action: event.target.value })}>
              <option value="add">批量添加</option>
              <option value="delete">批量删除</option>
            </select>
            <textarea
              value={batch.models}
              placeholder={batch.action === 'delete' ? '每行一个模型名；输入 -all 删除当前渠道全部模型' : '每行一个模型名，也可用逗号分隔'}
              onChange={(event) => setBatch({ ...batch, models: event.target.value })}
            />
            <button className="smallBtn" onClick={applyBatch}><Save />执行</button>
          </div>
        )}
        <div className="modelGroups">
          {Object.entries(grouped).length ? Object.entries(grouped).map(([channelName, rows]) => {
            const expanded = expandedGroups[channelName] || rows.length <= 5;
            const visibleRows = expanded ? rows : rows.slice(0, 5);
            return (
            <div className="modelGroup" key={channelName}>
              <div>
                <strong>{channelName}</strong>
                <span>{rows.length} 个模型</span>
              </div>
              <div className="modelChips">
                {visibleRows.map((model) => (
                  <div className="modelEditor" key={model.id || model.model_id}>
                    <div className="modelEditorBody">
                      {admin ? (
                        <input
                          aria-label="模型显示名"
                          value={drafts[model.id] ?? model.display_name ?? model.model_id}
                          onChange={(event) => setDrafts({ ...drafts, [model.id]: event.target.value })}
                        />
                      ) : (
                        <button className="modelChip" onClick={() => navigator.clipboard.writeText(model.display_name || model.model_id)} title="点击复制模型名">
                          {model.display_name || model.model_id}
                        </button>
                      )}
                      <span>上游：{model.model_id}</span>
                    </div>
                    <div className="rowActions">
                      <button className="iconBtn" onClick={() => navigator.clipboard.writeText(drafts[model.id] || model.display_name || model.model_id)} title="复制"><Copy /></button>
                      {admin && <button className="smallBtn" onClick={() => saveModel(model)}><Save />保存</button>}
                      {admin && <button className="iconBtn danger" onClick={() => removeModel(model)} title="隐藏"><Trash2 /></button>}
                    </div>
                  </div>
                ))}
              </div>
              {rows.length > 5 && (
                <button className="smallBtn foldBtn" onClick={() => setExpandedGroups({ ...expandedGroups, [channelName]: !expandedGroups[channelName] })}>
                  {expandedGroups[channelName] ? '收起模型' : `展开全部 ${rows.length} 个模型`}
                </button>
              )}
            </div>
          );}) : <div className="empty">暂无模型。请到渠道设置里测试渠道，同步成功后会显示在这里。</div>}
        </div>
      </div>
    </section>
  );
}

function AdminSettings({ api, settings, onSaved }: { api: ApiClient; settings: SettingsShape; onSaved: (settings: SettingsShape) => void }) {
  const [form, setForm] = useState(settings);
  const [testingNotify, setTestingNotify] = useState('');
  const [testingUmami, setTestingUmami] = useState(false);
  async function save() {
    const data = await api.put('/api/admin/settings', form);
    onSaved(data.settings);
  }
  async function testNotify(type: 'telegram' | 'wxpusher') {
    setTestingNotify(type);
    try {
      await api.post('/api/admin/notify-test', { type });
    } finally {
      setTestingNotify('');
    }
  }
  async function testUmami() {
    setTestingUmami(true);
    try {
      const data = await api.put('/api/admin/settings', form);
      onSaved(data.settings);
      await api.post('/api/admin/umami-test', {});
    } finally {
      setTestingUmami(false);
    }
  }
  return (
    <section className="content">
      <div className="panel settingsGrid">
        <h2>系统设置</h2>
        <Input label="站点名称" value={form.siteName} onChange={(siteName) => setForm({ ...form, siteName })} />
        <ThemePicker value={form.themeName || 'black-white'} onChange={(themeName) => {
          document.documentElement.dataset.theme = themeName;
          setForm({ ...form, themeName });
        }} />
        <p className="hintText">注册、邮箱验证、人机验证和推送均默认关闭，需要时可单独开启。</p>
        <Toggle label="开放注册" checked={form.registrationEnabled} onChange={(registrationEnabled) => setForm({ ...form, registrationEnabled })} />
        <Toggle label="邮箱验证" checked={form.emailVerificationEnabled} onChange={(emailVerificationEnabled) => setForm({ ...form, emailVerificationEnabled })} />
        <Toggle label="邮箱后缀验证" checked={form.emailDomainValidationEnabled} onChange={(emailDomainValidationEnabled) => setForm({ ...form, emailDomainValidationEnabled })} />
        <Toggle label="QQ 邮箱强制数字前缀" checked={form.qqEmailNumericPrefixRequired} onChange={(qqEmailNumericPrefixRequired) => setForm({ ...form, qqEmailNumericPrefixRequired })} />
        <Toggle label="人机验证" checked={form.captchaEnabled} onChange={(captchaEnabled) => setForm({ ...form, captchaEnabled })} />
        <p className="hintText">Turnstile Site Key 请填写到 Pages 变量 `VITE_TURNSTILE_SITE_KEY`，Secret Key 请填写到 Worker 变量 `TURNSTILE_SECRET_KEY`。</p>
        <Input label="背景图片 URL" value={form.backgroundImageUrl || ''} onChange={(backgroundImageUrl) => setForm({ ...form, backgroundImageUrl })} />
        <Input label="渠道检测间隔（分钟）" type="number" value={String(form.healthCheckIntervalMinutes)} onChange={(value) => setForm({ ...form, healthCheckIntervalMinutes: Number(value) })} />
        <Input label="Workers 用量检测间隔（分钟）" type="number" value={String(form.workerUsageIntervalMinutes)} onChange={(value) => setForm({ ...form, workerUsageIntervalMinutes: Number(value) })} />
        <Toggle label="推送 Workers 用量" checked={form.notifyWorkerUsage} onChange={(notifyWorkerUsage) => setForm({ ...form, notifyWorkerUsage })} />
        <div className="settingsSection">
          <strong>消息测试</strong>
          <p className="hintText">Telegram 的 Token / Chat ID / Thread ID，WxPusher 的 AppToken / UID / Topic ID 等都在 Worker 变量里配置。</p>
          <div className="rowActions left">
            <button className="smallBtn" onClick={() => testNotify('telegram')} disabled={testingNotify === 'telegram'}><RefreshCw className={testingNotify === 'telegram' ? 'spin' : ''} />测试 Telegram</button>
            <button className="smallBtn" onClick={() => testNotify('wxpusher')} disabled={testingNotify === 'wxpusher'}><RefreshCw className={testingNotify === 'wxpusher' ? 'spin' : ''} />测试 WxPusher</button>
          </div>
        </div>
        <div className="settingsSection">
          <strong>前端 Umami</strong>
          <p className="hintText">按 Umami 网站的 Tracking code 配置，用于统计 Pages 控制台访问。也可用 Pages 变量 `VITE_UMAMI_SCRIPT_URL`、`VITE_UMAMI_WEBSITE_ID`、`VITE_UMAMI_HOST_URL` 作为备用值。</p>
          <Toggle label="启用前端 Umami" checked={form.frontendUmamiEnabled} onChange={(frontendUmamiEnabled) => setForm({ ...form, frontendUmamiEnabled })} />
          <Input label="前端 Website ID" value={form.frontendUmamiWebsiteId || ''} onChange={(frontendUmamiWebsiteId) => setForm({ ...form, frontendUmamiWebsiteId })} />
          <Input label="前端 Script URL" value={form.frontendUmamiScriptUrl || ''} placeholder="https://cloud.umami.is/script.js" onChange={(frontendUmamiScriptUrl) => setForm({ ...form, frontendUmamiScriptUrl })} />
          <Input label="前端 Host URL（可选）" value={form.frontendUmamiHostUrl || ''} placeholder="https://cloud.umami.is" onChange={(frontendUmamiHostUrl) => setForm({ ...form, frontendUmamiHostUrl })} />
        </div>
        <div className="settingsSection">
          <strong>后端 Umami</strong>
          <p className="hintText">通过 Umami 官方 `POST /api/send` 事件接口统计 Worker 请求。也可用 Worker 变量 `UMAMI_BACKEND_ENABLED`、`UMAMI_BACKEND_HOST_URL`、`UMAMI_BACKEND_WEBSITE_ID`、`UMAMI_BACKEND_HOSTNAME` 覆盖这里的设置。</p>
          <Toggle label="启用后端 Umami" checked={form.backendUmamiEnabled} onChange={(backendUmamiEnabled) => setForm({ ...form, backendUmamiEnabled })} />
          <Input label="后端 Website ID" value={form.backendUmamiWebsiteId || ''} onChange={(backendUmamiWebsiteId) => setForm({ ...form, backendUmamiWebsiteId })} />
          <Input label="后端 Host URL" value={form.backendUmamiHostUrl || ''} placeholder="https://cloud.umami.is" onChange={(backendUmamiHostUrl) => setForm({ ...form, backendUmamiHostUrl })} />
          <Input label="后端 Hostname（可选）" value={form.backendUmamiHostname || ''} placeholder="api.example.com" onChange={(backendUmamiHostname) => setForm({ ...form, backendUmamiHostname })} />
          <button className="smallBtn" onClick={testUmami} disabled={testingUmami}>
            <RefreshCw className={testingUmami ? 'spin' : ''} />{testingUmami ? '测试中' : '保存并测试后端 Umami'}
          </button>
        </div>
        <button className="primaryBtn" onClick={save}><Save />保存设置</button>
      </div>
    </section>
  );
}

function ThemePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="themePicker">
      <span>颜色主题</span>
      <div>
        {themeOptions.map((theme) => (
          <button key={theme.key} className={value === theme.key ? 'active' : ''} onClick={() => onChange(theme.key)}>
            <i>
              {theme.colors.map((color, index) => <b key={`${theme.key}-${index}`} style={{ background: color }} />)}
            </i>
            {theme.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function UsersPage({ api }: { api: ApiClient }) {
  const [users, setUsers] = useState<any[]>([]);
  async function load() {
    const data = await api.get('/api/admin/users');
    setUsers(data.users);
  }
  useLoad(load, []);
  async function update(row: any, patch: any) {
    await api.patch(`/api/admin/users/${row.id}`, { ...row, ...patch });
    await load();
  }
  async function remove(row: any) {
    if (!confirm(`确定删除用户 ${row.email}？`)) return;
    await api.delete(`/api/admin/users/${row.id}`);
    await load();
  }
  return (
    <section className="content">
      <div className="panel">
        <h2>用户设置</h2>
        <DataTable rows={users} columns={['email', 'name', 'role', 'status', 'email_verified_at', 'created_at']} action={(row) => (
          <div className="rowActions">
            <button className="smallBtn" onClick={() => update(row, { status: row.status === 'active' ? 'disabled' : 'active' })}>{row.status === 'active' ? '停用' : '启用'}</button>
            {row.role !== 'super_admin' && <button className="iconBtn danger" onClick={() => remove(row)} title="删除"><Trash2 /></button>}
          </div>
        )} />
      </div>
    </section>
  );
}

function Channels({ api }: { api: ApiClient }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [checkingAll, setCheckingAll] = useState(false);
  const [testingId, setTestingId] = useState('');
  const [form, setForm] = useState({ name: '', provider: 'openai-compatible', base_url: 'https://api.openai.com/v1', is_full_url: false, api_key: '', priority: 100, status: 'active' });
  async function load() {
    const channelData = await api.get('/api/admin/channels');
    setChannels(channelData.channels);
  }
  useLoad(load, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    await api.post('/api/admin/channels', form);
    setForm({ ...form, name: '', api_key: '', is_full_url: false });
    await load();
  }
  async function remove(id: string) {
    await api.delete(`/api/admin/channels/${id}`);
    await load();
  }
  async function check() {
    setCheckingAll(true);
    try {
      await api.post('/api/admin/health-check', {});
      await load();
    } finally {
      setCheckingAll(false);
    }
  }
  async function testChannel(id: string) {
    setTestingId(id);
    try {
      await api.post(`/api/admin/channels/${id}/test`, {});
      await load();
    } finally {
      setTestingId('');
    }
  }
  return (
    <section className="content split">
      <form className="panel" onSubmit={save}>
        <h2>新增渠道</h2>
        <Input label="名称" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Base URL" value={form.base_url} onChange={(base_url) => setForm({ ...form, base_url })} />
        <label className="checkboxField">
          <input type="checkbox" checked={form.is_full_url} onChange={(event) => setForm({ ...form, is_full_url: event.target.checked })} />
          <span>是否为完整 URL</span>
        </label>
        <p className="hintText">不勾选时自动补全 `/v1/chat/completions`；勾选后测试与调用均原样使用上方链接。</p>
        <Input label="上游 API Key" type="password" value={form.api_key} onChange={(api_key) => setForm({ ...form, api_key })} />
        <Input label="优先级" type="number" value={String(form.priority)} onChange={(priority) => setForm({ ...form, priority: Number(priority) })} />
        <button className="primaryBtn"><Plus />保存渠道</button>
      </form>
      <div className="panel">
        <div className="toolbar compact"><h2>渠道列表</h2><button className="smallBtn" onClick={check} disabled={checkingAll}><RefreshCw className={checkingAll ? 'spin' : ''} />{checkingAll ? '检测中' : '立即检测'}</button></div>
        <DataTable rows={channels} columns={['name', 'base_url', 'full_url_mode', 'working_url', 'health_latency_ms', 'priority', 'status', 'health_status', 'last_checked_at']} action={(row) => <div className="rowActions"><button className="smallBtn" onClick={() => testChannel(row.id)} disabled={testingId === row.id}><RefreshCw className={testingId === row.id ? 'spin' : ''} />测试</button><button className="iconBtn danger" onClick={() => remove(row.id)} title="删除"><Trash2 /></button></div>} />
      </div>
    </section>
  );
}

function WorkerUsage({ api }: { api: ApiClient }) {
  const [rows, setRows] = useState<any[]>([]);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState('');
  const [lastError, setLastError] = useState('');
  const [quotaLimit, setQuotaLimit] = useState(100000);
  const [busy, setBusy] = useState(false);
  async function load() {
    const data = await api.get('/api/admin/worker-usage');
    setConfigured(data.configured !== false);
    setMessage(data.message || '');
    setLastError(data.lastError || '');
    setQuotaLimit(Number(data.quotaLimit || 100000));
    setRows(data.snapshots || []);
  }
  useLoad(load, []);
  async function capture() {
    setBusy(true);
    try {
      await api.post('/api/admin/worker-usage-check', {});
    } finally {
      try {
        await load();
      } finally {
        setBusy(false);
      }
    }
  }
  const latest = rows[0];
  return (
    <section className="content">
      <div className="toolbar"><h2>Workers 用量监测</h2><button className="primaryBtn" onClick={capture} disabled={busy || !configured}><RefreshCw className={busy ? 'spin' : ''} />{busy ? '检测中' : '立即采集'}</button></div>
      {!configured && <div className="panel"><div className="errorText">{message || '请配置 Cloudflare 账号 ID 和 API Token 变量后再检测 Workers 用量。'}</div></div>}
      {configured && lastError && <div className="panel"><div className="errorText">上次查询失败：{lastError}</div></div>}
      {configured && !lastError && !latest && <div className="panel"><div className="empty">变量已识别，点击“立即采集”检查 Cloudflare 用量接口。</div></div>}
      {latest && (
        <div className="metricGrid workerMetrics">
          <Metric label="当前已用" value={latest.used_percent || '0%'} />
          <Metric label="当前剩余" value={latest.remaining_percent || '100%'} />
          <Metric label="日额度" value={quotaLimit.toLocaleString()} />
        </div>
      )}
      <div className="panel"><DataTable rows={rows} columns={['created_at', 'used_percent', 'remaining_percent', 'period_start', 'period_end']} /></div>
    </section>
  );
}

function Metric({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function DataTable({ rows, columns, action }: { rows: any[]; columns: string[]; action?: (row: any) => React.ReactNode }) {
  if (!rows.length) return <div className="empty">暂无数据</div>;
  return (
    <div className="tableWrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{labelOf(column)}</th>)}{action && <th />}</tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}{action && <td className="actionCell">{action(row)}</td>}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

function Segmented({ value, options, onChange }: { value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div className="segmented">{options.map(([key, label]) => <button type="button" key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

function LoadingPanel() {
  return <div className="panel centerPanel"><RefreshCw className="spin" />加载中</div>;
}

function useLoad(fn: () => Promise<unknown>, deps: React.DependencyList) {
  useEffect(() => {
    fn().catch(console.error);
  }, deps);
}

function useTurnstile(siteKey: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState('');
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const timer = window.setInterval(() => {
      const turnstile = (window as any).turnstile;
      if (turnstile && ref.current && !ref.current.dataset.rendered) {
        ref.current.dataset.rendered = 'true';
        turnstile.render(ref.current, { sitekey: siteKey, callback: setToken });
        window.clearInterval(timer);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [siteKey]);
  return { ref, token };
}

type ApiClient = ReturnType<typeof makeApi>;

function makeApi(token: string, setNotice: (message: string) => void) {
  async function request(path: string, method: string, body?: unknown, auth = true): Promise<any> {
    setNotice('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(auth && token ? { authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        throw new Error('请求后端超时，请检查 Worker 是否部署成功、Pages 的 VITE_API_BASE_URL 是否正确');
      }
      throw new Error('请求后端失败，请检查 Worker 域名、CORS 和 Pages 的 VITE_API_BASE_URL');
    } finally {
      window.clearTimeout(timer);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      throw new Error(text ? `后端返回的不是 JSON：${text.slice(0, 120)}` : '后端返回的不是 JSON，请检查 Worker 地址');
    }
    const data: any = await response.json();
    if (!response.ok) {
      const message = data.error || '请求失败';
      setNotice(message);
      throw new Error(message);
    }
    if (method !== 'GET') setNotice(data.message || '成功');
    return data;
  }
  return {
    get: (path: string, auth = true) => request(path, 'GET', undefined, auth),
    post: (path: string, body: unknown, auth = true) => request(path, 'POST', body, auth),
    put: (path: string, body: unknown) => request(path, 'PUT', body),
    patch: (path: string, body: unknown) => request(path, 'PATCH', body),
    delete: (path: string) => request(path, 'DELETE')
  };
}

function pageTitle(active: NavKey) {
  return {
    dashboard: '总览',
    keys: 'API Key',
    usage: '用量统计',
    models: '模型广场',
    settings: '系统设置',
    users: '用户设置',
    channels: '渠道设置',
    workerUsage: 'Workers 用量'
  }[active];
}

function roleText(role: string) {
  return role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : '用户';
}

function labelOf(key: string) {
  const labels: Record<string, string> = {
    created_at: '时间',
    updated_at: '更新时间',
    path: '路径',
    model: '模型',
    status: '状态',
    total_tokens: 'Token',
    latency_ms: '延迟',
    name: '名称',
    key_prefix: '前缀',
    last_used_at: '最近使用',
    model_id: '模型 ID',
    display_name: '显示名称',
    channel_name: '渠道',
    email: '邮箱',
    role: '角色',
    email_verified_at: '邮箱验证',
    base_url: 'Base URL',
    priority: '优先级',
    health_status: '健康',
    last_checked_at: '检测时间',
    working_url: '成功调用 URL',
    full_url_mode: '完整 URL',
    health_latency_ms: '延迟(ms)',
    requests: '请求',
    errors: '错误',
    cpu_time_ms: 'CPU',
    used_percent: '已用百分比',
    remaining_percent: '剩余百分比',
    quota_limit: '日额度',
    period_start: '开始',
    period_end: '结束',
    range: '范围',
    hour: '小时',
    tokens: 'Token',
    latency: '平均延迟',
    api_key_name: 'API Key 名称',
    user_email: '用户邮箱',
    user_name: '用户名称',
    success_rate: '成功率'
  };
  return labels[key] || key;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && isDateTime(value)) return formatChinaTime(value);
  return String(value);
}

function isDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(value);
}

function formatChinaTime(value: string) {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const utcText = /z$/i.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(utcText);
  if (Number.isNaN(date.getTime())) return value;
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
}

createRoot(document.getElementById('root')!).render(<App />);
