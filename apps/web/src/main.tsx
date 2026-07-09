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
};

type NavKey = 'dashboard' | 'keys' | 'usage' | 'models' | 'settings' | 'users' | 'channels' | 'workerUsage';

const tokenStoreKey = 'api-relay-token';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const defaultSettings: SettingsShape = {
  siteName: 'API Relay',
  appMode: 'self',
  registrationEnabled: true,
  emailVerificationEnabled: false,
  captchaEnabled: false,
  captchaSiteKey: '',
  healthCheckIntervalMinutes: 60,
  workerUsageIntervalMinutes: 60,
  defaultChannelStrategy: 'priority',
  notifyWorkerUsage: false
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenStoreKey) || '');
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SettingsShape>(defaultSettings);
  const [setupRequired, setSetupRequired] = useState(false);
  const [active, setActive] = useState<NavKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const [notice, setNotice] = useState('');

  const api = useMemo(() => makeApi(token, setNotice), [token]);

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
      localStorage.removeItem(tokenStoreKey);
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
    localStorage.setItem(tokenStoreKey, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setSetupRequired(false);
    setActive('dashboard');
  }

  async function logout() {
    await api.post('/api/auth/logout', {});
    localStorage.removeItem(tokenStoreKey);
    setToken('');
    setUser(null);
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">AR</div>
          <div>
            <strong>{settings.siteName}</strong>
            <span>{settings.appMode === 'multi' ? '多人模式' : '自用模式'}</span>
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
        {active === 'keys' && <ApiKeys api={api} publicBase={settings.apiPublicBaseUrl || location.origin} />}
        {active === 'usage' && <Usage api={api} />}
        {active === 'models' && <Models api={api} />}
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
        <span>检查 Worker 是否已经绑定 D1：变量名 `DB`，数据库 `api_relay`。</span>
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
          <div className="brandMark">AR</div>
          <div>
            <strong>{title}</strong>
            <span>Cloudflare Workers and Pages API relay</span>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function Setup({ settings, api, onDone }: { settings: SettingsShape; api: ApiClient; onDone: (token: string, user: User) => void }) {
  const [form, setForm] = useState({ secret: '', email: '', name: 'Super Admin', password: '', siteName: settings.siteName, appMode: 'self' });
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
      <Segmented value={form.appMode} options={[['self', '自用配置'], ['multi', '多人配置']]} onChange={(appMode) => setForm({ ...form, appMode })} />
      <p className="hintText">密码至少 8 位，管理员密钥必须和 Worker 变量 `ADMIN_SETUP_SECRET` 完全一致。</p>
      {error && <p className="errorText">{error}</p>}
      <button className="primaryBtn" disabled={busy}><Shield />{busy ? '正在初始化' : '完成初始化'}</button>
    </form>
  );
}

function Auth({ settings, api, onLogin }: { settings: SettingsShape; api: ApiClient; onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const captchaToken = useTurnstile(settings.captchaEnabled && mode === 'register' ? settings.captchaSiteKey : '');

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
      const data = await api.post('/api/auth/register', { ...form, captchaToken: captchaToken.token }, false);
      setMessage(data.message || '注册成功，请检查邮箱');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '请求失败');
    } finally {
      setBusy(false);
    }
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
      {settings.captchaEnabled && mode === 'register' && <div className="turnstile" ref={captchaToken.ref}>{settings.captchaSiteKey ? '' : '未配置 Turnstile Site Key'}</div>}
      {error && <p className="errorText">{error}</p>}
      <button className="primaryBtn" disabled={busy}>{mode === 'login' ? <LogOut /> : <CheckCircle2 />}{busy ? '请稍候' : mode === 'login' ? '登录' : '创建账号'}</button>
      {message && <p className="successText">{message}</p>}
    </form>
  );
}

function Dashboard({ api }: { api: ApiClient }) {
  const [data, setData] = useState<any>(null);
  useLoad(() => api.get('/api/dashboard').then(setData), []);
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
  const [newKey, setNewKey] = useState('');
  async function load() {
    const data = await api.get('/api/api-keys');
    setKeys(data.keys);
  }
  useLoad(load, []);
  async function create() {
    const name = prompt('密钥名称', '默认密钥') || '默认密钥';
    const data = await api.post('/api/api-keys', { name });
    setNewKey(data.key.token);
    await load();
  }
  async function revoke(id: string) {
    await api.delete(`/api/api-keys/${id}`);
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
      {newKey && <div className="copyBox"><code>{newKey}</code><button onClick={() => navigator.clipboard.writeText(newKey)}><Copy /></button></div>}
      <div className="panel"><DataTable rows={keys} columns={['name', 'key_prefix', 'status', 'last_used_at', 'created_at']} action={(row) => <button className="iconBtn danger" onClick={() => revoke(row.id)}><Trash2 /></button>} /></div>
    </section>
  );
}

function Usage({ api }: { api: ApiClient }) {
  const [rows, setRows] = useState<any[]>([]);
  useLoad(() => api.get('/api/usage?days=14').then((data) => setRows(data.rows)), []);
  const max = Math.max(1, ...rows.map((row) => Number(row.requests || 0)));
  return (
    <section className="content">
      <div className="panel">
        <h2>14 天使用数据</h2>
        <div className="bars">
          {rows.map((row) => <div key={row.day}><span>{row.day}</span><div><i style={{ width: `${(Number(row.requests) / max) * 100}%` }} /></div><b>{row.requests}</b></div>)}
        </div>
      </div>
    </section>
  );
}

function Models({ api }: { api: ApiClient }) {
  const [models, setModels] = useState<any[]>([]);
  useLoad(() => api.get('/api/models').then((data) => setModels(data.models)), []);
  const grouped = models.reduce<Record<string, any[]>>((acc, model) => {
    const key = model.channel_name || '未命名渠道';
    acc[key] = acc[key] || [];
    acc[key].push(model);
    return acc;
  }, {});
  return (
    <section className="content">
      <div className="panel">
        <h2>模型广场</h2>
        <p>渠道测试成功后会自动从上游 `/models` 同步模型。复制模型 ID 到 SillyTavern 使用。</p>
        <div className="modelGroups">
          {Object.entries(grouped).length ? Object.entries(grouped).map(([channelName, rows]) => (
            <div className="modelGroup" key={channelName}>
              <div>
                <strong>{channelName}</strong>
                <span>{rows.length} 个模型</span>
              </div>
              <div className="modelChips">
                {rows.map((model) => (
                  <button
                    className="modelChip"
                    key={model.id || model.model_id}
                    onClick={() => navigator.clipboard.writeText(model.model_id)}
                    title="点击复制模型 ID"
                  >
                    {model.model_id}
                  </button>
                ))}
              </div>
            </div>
          )) : <div className="empty">暂无模型。请到渠道设置里测试渠道，同步成功后会显示在这里。</div>}
        </div>
      </div>
    </section>
  );
}

function AdminSettings({ api, settings, onSaved }: { api: ApiClient; settings: SettingsShape; onSaved: (settings: SettingsShape) => void }) {
  const [form, setForm] = useState(settings);
  async function save() {
    const data = await api.put('/api/admin/settings', form);
    onSaved(data.settings);
  }
  return (
    <section className="content">
      <div className="panel settingsGrid">
        <h2>系统设置</h2>
        <Input label="站点名称" value={form.siteName} onChange={(siteName) => setForm({ ...form, siteName })} />
        <Segmented value={form.appMode} options={[['self', '自用配置'], ['multi', '多人配置']]} onChange={(appMode) => setForm({ ...form, appMode: appMode as 'self' | 'multi', emailVerificationEnabled: appMode === 'multi' })} />
        <p className="hintText">自用配置默认关闭邮箱验证；多人配置默认启用邮箱验证，可按需要手动调整。</p>
        <Toggle label="开放注册" checked={form.registrationEnabled} onChange={(registrationEnabled) => setForm({ ...form, registrationEnabled })} />
        <Toggle label="邮箱验证" checked={form.emailVerificationEnabled} onChange={(emailVerificationEnabled) => setForm({ ...form, emailVerificationEnabled })} />
        <Toggle label="人机验证" checked={form.captchaEnabled} onChange={(captchaEnabled) => setForm({ ...form, captchaEnabled })} />
        <Input label="Turnstile Site Key" value={form.captchaSiteKey || ''} onChange={(captchaSiteKey) => setForm({ ...form, captchaSiteKey })} />
        <Input label="渠道检测间隔（分钟）" type="number" value={String(form.healthCheckIntervalMinutes)} onChange={(value) => setForm({ ...form, healthCheckIntervalMinutes: Number(value) })} />
        <Input label="Workers 用量检测间隔（分钟）" type="number" value={String(form.workerUsageIntervalMinutes)} onChange={(value) => setForm({ ...form, workerUsageIntervalMinutes: Number(value) })} />
        <Toggle label="推送 Workers 用量" checked={form.notifyWorkerUsage} onChange={(notifyWorkerUsage) => setForm({ ...form, notifyWorkerUsage })} />
        <button className="primaryBtn" onClick={save}><Save />保存设置</button>
      </div>
    </section>
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
  return (
    <section className="content">
      <div className="panel">
        <h2>用户设置</h2>
        <DataTable rows={users} columns={['email', 'name', 'role', 'status', 'email_verified_at', 'created_at']} action={(row) => (
          <button className="smallBtn" onClick={() => update(row, { status: row.status === 'active' ? 'disabled' : 'active' })}>{row.status === 'active' ? '停用' : '启用'}</button>
        )} />
      </div>
    </section>
  );
}

function Channels({ api }: { api: ApiClient }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', provider: 'openai-compatible', base_url: 'https://api.openai.com/v1', api_key: '', priority: 100, status: 'active' });
  async function load() {
    const channelData = await api.get('/api/admin/channels');
    setChannels(channelData.channels);
  }
  useLoad(load, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    await api.post('/api/admin/channels', form);
    setForm({ ...form, name: '', api_key: '' });
    await load();
  }
  async function remove(id: string) {
    await api.delete(`/api/admin/channels/${id}`);
    await load();
  }
  async function check() {
    await api.post('/api/admin/health-check', {});
    setTimeout(load, 1500);
  }
  async function testChannel(id: string) {
    await api.post(`/api/admin/channels/${id}/test`, {});
    await load();
  }
  return (
    <section className="content split">
      <form className="panel" onSubmit={save}>
        <h2>新增渠道</h2>
        <Input label="名称" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Base URL" value={form.base_url} onChange={(base_url) => setForm({ ...form, base_url })} />
        <Input label="上游 API Key" type="password" value={form.api_key} onChange={(api_key) => setForm({ ...form, api_key })} />
        <Input label="优先级" type="number" value={String(form.priority)} onChange={(priority) => setForm({ ...form, priority: Number(priority) })} />
        <button className="primaryBtn"><Plus />保存渠道</button>
      </form>
      <div className="panel">
        <div className="toolbar compact"><h2>渠道列表</h2><button className="smallBtn" onClick={check}><RefreshCw />立即检测</button></div>
        <DataTable rows={channels} columns={['name', 'base_url', 'priority', 'status', 'health_status', 'last_checked_at']} action={(row) => <div className="rowActions"><button className="iconBtn" onClick={() => testChannel(row.id)}><RefreshCw /></button><button className="iconBtn danger" onClick={() => remove(row.id)}><Trash2 /></button></div>} />
      </div>
    </section>
  );
}

function WorkerUsage({ api }: { api: ApiClient }) {
  const [rows, setRows] = useState<any[]>([]);
  async function load() {
    const data = await api.get('/api/admin/worker-usage');
    setRows(data.snapshots);
  }
  useLoad(load, []);
  async function capture() {
    await api.post('/api/admin/worker-usage-check', {});
    setTimeout(load, 1200);
  }
  return (
    <section className="content">
      <div className="toolbar"><h2>Workers 用量监测</h2><button className="primaryBtn" onClick={capture}><RefreshCw />立即采集</button></div>
      <div className="panel"><DataTable rows={rows} columns={['created_at', 'requests', 'errors', 'cpu_time_ms', 'period_start', 'period_end']} /></div>
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

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
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
    if (method !== 'GET') setNotice('已保存');
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
    requests: '请求',
    errors: '错误',
    cpu_time_ms: 'CPU',
    period_start: '开始',
    period_end: '结束'
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
