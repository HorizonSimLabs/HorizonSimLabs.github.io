/**
 * HorizonSimLabs 地景数据接口（Cloudflare Worker）
 *
 * 职责只有一件事：把 D1 里 scenery 表的数据以 JSON 返回，供前端（GitHub Pages）读取。
 * 不包含任何 Twikoo 相关逻辑。
 *
 * 路由：
 *   GET /api/landscapes              返回全部地景条目
 *   GET /api/landscapes?id=<id>      返回单条
 *   GET /api/landscapes?country=丹麦 按 country 字段过滤（仅当表里有该字段）
 *   OPTIONS *                        CORS 预检
 *   GET / 或 /api                    健康检查，确认 DB 绑定正常
 *
 * 返回格式（与原来 done.json 的每一行一一对应）：
 *   { "ok": true, "count": 66, "data": [
 *       { "id": 1, "rawProvince": "比隆", "author": "...",
 *         "freeLink": "...", "freeLevel": "...",
 *         "paidLink": "...", "paidLevel": "...", "remark": "..." }, ... ] }
 *
 * 表结构自适应：
 *   - 分列写法（rawProvince/author/freeLink/… 或 raw_province/free_link/…）→ 直接按列名取；
 *   - 整行原文写法（line/text/content）→ 按 `省名;作者;免费链接;免费版本;付费链接;付费版本;备注` 拆开。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS },
  });
}

/* ============================================================
 * 通用工具：字符串清洗、分号校验、限流、口令校验
 * ============================================================ */

const LIMITS = {
  name: 60, author: 60, link: 300, level: 40, remark: 500,
};

/** 去掉控制字符、首尾空白，并在超过 max 时返回错误 */
function clean(value, max, label) {
  const s = String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (s.length > max) throw new HttpError(400, `${label}太长了（最多 ${max} 个字符）`);
  return s;
}

/** 字段里不能出现分号：scenery 表的旧格式用分号分隔，写了会污染整行 */
function noSemicolon(label) {
  return (v) => (v.indexOf(';') >= 0 || v.indexOf('；') >= 0)
    ? `${label}里不能包含分号（; 或 ；），请用逗号代替`
    : null;
}

/**
 * 「无」的规范写法是「无|None」（中文|英文），与 done.json 历史数据一致。
 * 这里仍宽容识别「无」「none」「-」等旧写法，但入口会把它们统一规范成「无|None」再入库，
 * 保证数据库里只有一种写法，前端渲染不用再判两套。
 */
const NONE_RE = /^(无|沒有|没有|none|-|—|－|n\/a|na|null|空)(\s*[|｜/]\s*(none|无)|)$/i;

/** 规范化：任何「表示没有」的写法 → '无|None'；其它原样返回 */
function normalizeNone(v) {
  const s = String(v === null || v === undefined ? '' : v).trim();
  return NONE_RE.test(s) ? '无|None' : s;
}

function isNoneValue(v) {
  return !v || NONE_RE.test(String(v).trim());
}

/** 链接字段：必填，允许填「无|None」；真填了链接就必须 http(s) 开头 */
function checkLink(label) {
  return (v) => {
    if (!v) return `${label}是必填项，没有就填「无|None」`;
    if (NONE_RE.test(v)) return null;
    if (!/^https?:\/\/\S+$/i.test(v)) return `${label}必须以 http:// 或 https:// 开头，没有请填「无|None」`;
    return null;
  };
}

/** 等级字段：必填，允许填「无|None」，不能带分号 */
function checkLevel(label) {
  return (v) => {
    if (!v) return `${label}是必填项，没有就填「无|None」`;
    return noSemicolon(label)(v);
  };
}

function checkRequired(label) {
  return (v) => v ? null : `${label}是必填项，没有就填「无|None」`;
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** 校验提交内容；返回清洗后的对象，不合法时抛 HttpError */
function validateSubmission(body) {
  const src = body && typeof body === 'object' ? body : {};
  const name = clean(src.name, LIMITS.name, '地景名称');
  const author = clean(src.author, LIMITS.author, '作者');
  const freeLink = clean(src.freeLink, LIMITS.link, '免费版链接');
  const freeLevel = clean(src.freeLevel, LIMITS.level, '免费版等级');
  const paidLink = clean(src.paidLink, LIMITS.link, '付费版链接');
  const paidLevel = clean(src.paidLevel, LIMITS.level, '付费版等级');
  const remark = clean(src.remark, LIMITS.remark, '备注');

  const rules = [
    [name, checkRequired('地景名称'), '地景名称'],
    [name, noSemicolon('地景名称'), '地景名称'],
    [author, checkRequired('作者'), '作者'],
    [author, noSemicolon('作者'), '作者'],
    [freeLink, checkLink('免费版链接'), '免费版链接'],
    [freeLevel, checkLevel('免费版等级'), '免费版等级'],
    [paidLink, checkLink('付费版链接'), '付费版链接'],
    [paidLevel, checkLevel('付费版等级'), '付费版等级'],
    [remark, checkRequired('备注'), '备注'],
    [remark, noSemicolon('备注'), '备注'],
  ];
  for (const [value, rule] of rules) {
    const err = rule(value);
    if (err) throw new HttpError(400, err);
  }
  // 地图上点了必须有东西可下：两个链接不能都是「无」
  if (isNoneValue(freeLink) && isNoneValue(paidLink)) {
    throw new HttpError(400, '免费版链接和付费版链接至少要有一个真实的链接，不能都填「无|None」');
  }

  // 入库前统一规范成「无|None」，与 done.json 历史数据一致
  return {
    name,
    author: normalizeNone(author),
    freeLink: normalizeNone(freeLink),
    freeLevel: normalizeNone(freeLevel),
    paidLink: normalizeNone(paidLink),
    paidLevel: normalizeNone(paidLevel),
    remark: normalizeNone(remark),
  };
}

/** 简单的内存限流：每 IP 每小时 N 次提交（Worker 实例级，重启即清零，够用） */
const RATE = { windowMs: 3600 * 1000, max: 5 };
const rateBucket = new Map();

function checkRate(ip) {
  const now = Date.now();
  if (rateBucket.size > 2000) {
    for (const [k, v] of rateBucket) if (now - v.start > RATE.windowMs) rateBucket.delete(k);
  }
  const rec = rateBucket.get(ip);
  if (!rec || now - rec.start > RATE.windowMs) { rateBucket.set(ip, { start: now, count: 1 }); return null; }
  rec.count += 1;
  if (rec.count > RATE.max) return Math.ceil((RATE.windowMs - (now - rec.start)) / 60000);
  return null;
}

/** SHA-256，用来比对 Admin Token，避免明文比较 */
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sameSecret(a, b) {
  if (!a || !b) return false;
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  return ha === hb;
}

function readToken(request, url) {
  const auth = request.headers.get('Authorization') || '';
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  const h = request.headers.get('X-Admin-Token');
  if (h) return h.trim();
  return (url.searchParams.get('token') || '').trim();
}

/** 审核接口鉴权：与 Worker 环境变量 ADMIN_TOKEN 比对 */
async function requireAdmin(request, env, url) {
  if (!env.ADMIN_TOKEN) throw new HttpError(503, '还没有配置 ADMIN_TOKEN：请运行 npx wrangler secret put ADMIN_TOKEN');
  const token = readToken(request, url);
  if (!(await sameSecret(token, env.ADMIN_TOKEN))) throw new HttpError(401, '口令不正确');
}

/** submissions 表（首次提交时自动建） */
let submissionsReady = false;

async function ensureSubmissions(db) {
  if (submissionsReady) return;
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS submissions (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       name       TEXT NOT NULL,
       author     TEXT,
       free_link  TEXT,
       free_level TEXT,
       paid_link  TEXT,
       paid_level TEXT,
       remark     TEXT,
       status     TEXT NOT NULL DEFAULT 'pending',
       ip         TEXT,
       created_at TEXT DEFAULT (datetime('now'))
     )`
  ).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status, id)').run();
  submissionsReady = true;
}

function submissionOut(row) {
  return {
    id: row.id,
    name: row.name,
    author: row.author || '',
    freeLink: row.free_link || '',
    freeLevel: row.free_level || '',
    paidLink: row.paid_link || '',
    paidLevel: row.paid_level || '',
    remark: row.remark || '',
    status: row.status,
    createdAt: row.created_at,
  };
}

/* ============================================================
 * 路由处理
 * ============================================================ */

/** POST /api/submissions —— 用户提交（公开） */
async function handleSubmit(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const waitMin = checkRate(ip);
  if (waitMin !== null) throw new HttpError(429, `提交太频繁了，请 ${waitMin} 分钟后再试`);

  let body;
  try { body = await request.json(); }
  catch (e) { throw new HttpError(400, '请求体不是合法的 JSON'); }

  const v = validateSubmission(body);
  await ensureSubmissions(env.DB);

  const res = await env.DB.prepare(
    `INSERT INTO submissions (name, author, free_link, free_level, paid_link, paid_level, remark, status, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(v.name, v.author, v.freeLink, v.freeLevel, v.paidLink, v.paidLevel, v.remark, ip).run();

  return json({ ok: true, id: res.meta && res.meta.last_row_id, message: '提交成功，等待管理员审核' }, 201);
}

/** GET /api/admin/submissions?status=pending —— 审核列表（需口令） */
async function handleAdminList(env, url) {
  await ensureSubmissions(env.DB);
  const status = (url.searchParams.get('status') || 'pending').trim();
  const allowed = ['pending', 'approved', 'rejected', 'all'];
  const st = allowed.indexOf(status) >= 0 ? status : 'pending';
  const sql = st === 'all'
    ? 'SELECT * FROM submissions ORDER BY id DESC LIMIT 500'
    : 'SELECT * FROM submissions WHERE status = ? ORDER BY id DESC LIMIT 500';
  const res = st === 'all' ? await env.DB.prepare(sql).all() : await env.DB.prepare(sql).bind(st).all();
  const data = (res.results || []).map(submissionOut);
  return json({ ok: true, count: data.length, data });
}

/** POST /api/admin/submissions/:id/approve —— 通过并写进 scenery 表 */
async function handleApprove(env, id) {
  await ensureSubmissions(env.DB);
  const row = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, '这条提交不存在');
  if (row.status !== 'pending') throw new HttpError(409, `这条提交已经处理过了（当前状态：${row.status}）`);

  const insert = await env.DB.prepare(
    `INSERT INTO scenery (rawProvince, author, freeLink, freeLevel, paidLink, paidLevel, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(row.name, row.author || '', row.free_link || '', row.free_level || '', row.paid_link || '', row.paid_level || '', row.remark || '').run();

  await env.DB.prepare("UPDATE submissions SET status = 'approved' WHERE id = ?").bind(id).run();
  return json({ ok: true, id, landscapeId: insert.meta && insert.meta.last_row_id });
}

/** POST /api/admin/submissions/:id/reject —— 拒绝 */
async function handleReject(env, id) {
  await ensureSubmissions(env.DB);
  const row = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, '这条提交不存在');
  if (row.status !== 'pending') throw new HttpError(409, `这条提交已经处理过了（当前状态：${row.status}）`);
  await env.DB.prepare("UPDATE submissions SET status = 'rejected' WHERE id = ? AND status = 'pending'").bind(id).run();
  return json({ ok: true, id });
}

/** POST /api/admin/backup —— 把 scenery 表导出成 SQL，方便随时备份 */
async function handleBackup(env) {
  await ensureSubmissions(env.DB);
  const res = await env.DB.prepare('SELECT * FROM scenery ORDER BY id').all();
  const rows = res.results || [];
  const q = (v) => "'" + String(v === null || v === undefined ? '' : v).replace(/'/g, "''") + "'";
  const lines = ['-- scenery 表备份 ' + new Date().toISOString(), 'DELETE FROM scenery;'];
  for (const r of rows) {
    lines.push('INSERT INTO scenery (id, rawProvince, author, freeLink, freeLevel, paidLink, paidLevel, remark) VALUES (' +
      [r.id, r.rawProvince, r.author, r.freeLink, r.freeLevel, r.paidLink, r.paidLevel, r.remark].map(q).join(', ') + ');');
  }
  return json({ ok: true, count: rows.length, sql: lines.join('\n') });
}

/** GET /admin —— 审核界面（自带登录，静态 HTML） */
function adminPage() {
  return new Response(ADMIN_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>地景提交审核</title>
<style>
:root{--bg:#0b1220;--panel:#131d31;--line:rgba(140,170,220,.16);--text:#e8eefb;--dim:#9fb0cc;--brand:#4d8dff;--green:#25b25f;--red:#e5484d;--amber:#d99b1e}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(900px 500px at 15% -10%,rgba(77,141,255,.18),transparent),radial-gradient(700px 400px at 90% 0%,rgba(168,85,247,.13),transparent),var(--bg);color:var(--text);font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:22px;margin:0 0 4px;letter-spacing:.5px}
.sub{color:var(--dim);font-size:13px;margin-bottom:22px}
.muted{color:var(--dim)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:18px}
.login{max-width:420px;margin:80px auto}
.login h1{font-size:20px}
label{display:block;font-size:12px;color:var(--dim);margin:12px 0 6px;letter-spacing:.4px}
input,select,textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:#0c1526;color:var(--text);font:inherit;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--brand)}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid var(--line);background:#1a2540;color:var(--text);padding:9px 16px;transition:.15s}
button:hover{background:#22304f}
button.primary{background:linear-gradient(120deg,#4d8dff,#7b6cff);border-color:transparent;font-weight:600}
button.ok{background:var(--green);border-color:transparent;color:#06240f;font-weight:600}
button.no{background:transparent;border-color:rgba(229,72,77,.55);color:#ff9a9d}
button:disabled{opacity:.45;cursor:not-allowed}
.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.tabs{display:flex;gap:6px;background:#0c1526;border:1px solid var(--line);border-radius:10px;padding:4px}
.tabs button{background:transparent;border:none;padding:7px 14px;border-radius:8px;color:var(--dim)}
.tabs button.on{background:#22304f;color:var(--text)}
.spacer{flex:1}
.msg{padding:10px 14px;border-radius:10px;margin-bottom:14px;display:none}
.msg.err{display:block;background:rgba(229,72,77,.12);border:1px solid rgba(229,72,77,.45);color:#ffb3b5}
.msg.ok{display:block;background:rgba(37,178,95,.12);border:1px solid rgba(37,178,95,.45);color:#8ff0b4}
.item{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#101928}
.item-head{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:10px}
.name{font-size:16px;font-weight:700;color:#fff}
.tag{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--dim)}
.tag.pending{color:var(--amber);border-color:rgba(217,155,30,.45)}
.tag.approved{color:var(--green);border-color:rgba(37,178,95,.45)}
.tag.rejected{color:var(--red);border-color:rgba(229,72,77,.45)}
.grid{display:grid;grid-template-columns:110px 1fr;gap:6px 14px;font-size:13px}
.grid .k{color:var(--dim)}
.grid .v{word-break:break-all}
.grid .v a{color:var(--brand);text-decoration:none}
.grid .v a:hover{text-decoration:underline}
.acts{display:flex;gap:10px;margin-top:14px}
.empty{text-align:center;color:var(--dim);padding:40px 0}
@media(max-width:560px){.grid{grid-template-columns:1fr}.grid .k{margin-top:8px}}
</style>
</head>
<body>
<div class="wrap" id="loginView">
  <div class="card login">
    <h1>地景提交审核</h1>
    <div class="sub muted">输入管理员口令后进入审核队列。</div>
    <div class="msg" id="loginMsg"></div>
    <label for="token">口令</label>
    <input id="token" type="password" autocomplete="current-password" placeholder="ADMIN_TOKEN">
    <div style="margin-top:16px"><button class="primary" id="loginBtn" style="width:100%">进入</button></div>
  </div>
</div>

<div class="wrap" id="mainView" style="display:none">
  <h1>地景提交审核</h1>
  <div class="sub">提交内容只有在点「通过」之后才会写入 scenery 表并出现在地图上。</div>
  <div class="msg" id="msg"></div>
  <div class="bar">
    <div class="tabs" id="tabs">
      <button data-st="pending" class="on">待审核</button>
      <button data-st="approved">已通过</button>
      <button data-st="rejected">已拒绝</button>
    </div>
    <div class="spacer"></div>
    <button id="refreshBtn">刷新</button>
    <button id="backupBtn">备份 scenery</button>
    <button id="logoutBtn">退出</button>
  </div>
  <div id="list"></div>
</div>

<script>
(function () {
  var BASE = location.origin;
  var KEY = 'hsl-admin-token';
  var token = sessionStorage.getItem(KEY) || '';
  var status = 'pending';

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showMsg(text, ok) {
    var el = $('msg');
    el.textContent = text;
    el.className = 'msg ' + (ok ? 'ok' : 'err');
    clearTimeout(showMsg.t);
    showMsg.t = setTimeout(function () { el.className = 'msg'; }, 4000);
  }

  function api(path, method) {
    return fetch(BASE + path, {
      method: method || 'GET',
      headers: { 'X-Admin-Token': token }
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; })
        .then(function (b) { return { status: r.status, body: b }; });
    });
  }

  function login() {
    var t = $('token').value.trim();
    if (!t) return;
    fetch(BASE + '/api/admin/submissions?status=pending', { headers: { 'X-Admin-Token': t } })
      .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
      .then(function (res) {
        if (res.status !== 200 || !res.body.ok) {
          var m = $('loginMsg');
          m.textContent = res.body.error || ('HTTP ' + res.status);
          m.className = 'msg err';
          return;
        }
        token = t;
        sessionStorage.setItem(KEY, t);
        $('loginView').style.display = 'none';
        $('mainView').style.display = 'block';
        render(res.body.data);
      })
      .catch(function (e) {
        var m = $('loginMsg');
        m.textContent = '请求失败：' + e.message;
        m.className = 'msg err';
      });
  }

  var cache = [];

  function render(list) {
    cache = list || [];
    var box = $('list');
    if (!cache.length) {
      box.innerHTML = '<div class="empty">这里还没有内容</div>';
      return;
    }
    box.innerHTML = cache.map(function (it) {
      var link = function (u) {
        if (!u) return '<span class="muted">无|None</span>';
        // 「无|None」这类占位符不要在审核页显示成链接
        if (/^(无|none|-|—)(\s*[|｜]\s*(none|无))?$/i.test(u.trim())) return '<span class="muted">' + esc(u) + '</span>';
        return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>';
      };
      var acts = status === 'pending'
        ? '<div class="acts">' +
            '<button class="ok" data-act="approve" data-id="' + it.id + '">通过</button>' +
            '<button class="no" data-act="reject" data-id="' + it.id + '">拒绝</button>' +
          '</div>'
        : '';
      return '<div class="item">' +
        '<div class="item-head">' +
          '<span class="name">' + esc(it.name) + '</span>' +
          '<span class="tag ' + esc(it.status) + '">' + esc(it.status) + '</span>' +
          '<span class="tag">#' + esc(it.id) + '</span>' +
          '<span class="tag">' + esc(it.createdAt || '') + '</span>' +
        '</div>' +
        '<div class="grid">' +
          '<div class="k">作者</div><div class="v">' + (esc(it.author) || '<span class="muted">未填</span>') + '</div>' +
          '<div class="k">免费版</div><div class="v">' + link(it.freeLink) + ' <span class="muted">等级 ' + (esc(it.freeLevel) || '-') + '</span></div>' +
          '<div class="k">付费版</div><div class="v">' + link(it.paidLink) + ' <span class="muted">等级 ' + (esc(it.paidLevel) || '-') + '</span></div>' +
          '<div class="k">备注</div><div class="v">' + (esc(it.remark) || '<span class="muted">无|None</span>') + '</div>' +
        '</div>' + acts +
      '</div>';
    }).join('');
  }

  function load() {
    api('/api/admin/submissions?status=' + status).then(function (res) {
      if (res.status === 401) { logout(true); return; }
      if (!res.body.ok) { showMsg(res.body.error || '加载失败', false); return; }
      render(res.body.data);
    }).catch(function (e) { showMsg('请求失败：' + e.message, false); });
  }

  function act(id, kind) {
    var btns = document.querySelectorAll('[data-id="' + id + '"]');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    api('/api/admin/submissions/' + id + '/' + kind, 'POST').then(function (res) {
      if (res.body.ok) {
        showMsg(kind === 'approve' ? '已通过，已写入 scenery 表' : '已拒绝', true);
        load();
      } else {
        showMsg(res.body.error || '操作失败', false);
        for (var j = 0; j < btns.length; j++) btns[j].disabled = false;
      }
    }).catch(function (e) { showMsg('请求失败：' + e.message, false); });
  }

  function backup() {
    api('/api/admin/backup', 'POST').then(function (res) {
      if (!res.body.ok) { showMsg(res.body.error || '备份失败', false); return; }
      var blob = new Blob([res.body.sql], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'scenery-backup-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.sql';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      showMsg('已导出 ' + res.body.count + ' 条记录', true);
    }).catch(function (e) { showMsg('请求失败：' + e.message, false); });
  }

  function logout(silent) {
    token = '';
    sessionStorage.removeItem(KEY);
    $('mainView').style.display = 'none';
    $('loginView').style.display = 'block';
    if (!silent) showMsg('已退出', true);
  }

  $('loginBtn').addEventListener('click', login);
  $('token').addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
  $('refreshBtn').addEventListener('click', load);
  $('backupBtn').addEventListener('click', backup);
  $('logoutBtn').addEventListener('click', function () { logout(false); });
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-st]');
    if (!b) return;
    status = b.getAttribute('data-st');
    var all = $('tabs').querySelectorAll('button');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === b);
    load();
  });
  $('list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    act(b.getAttribute('data-id'), b.getAttribute('data-act'));
  });

  if (token) {
    $('loginView').style.display = 'none';
    $('mainView').style.display = 'block';
    load();
  }
})();
<\/script>
</body>
</html>`;

/** GET /api/landscapes 等 老逻辑（保持原样） */

/** 表结构探测结果缓存，避免每次请求都 PRAGMA */
let schemaCache = null;

async function getSchema(db) {
  const now = Date.now();
  if (schemaCache && now - schemaCache.at < 60000) return schemaCache;
  const info = await db.prepare('PRAGMA table_info(scenery)').all();
  const rows = info.results || [];
  if (!rows.length) throw new Error('scenery 表不存在或没有字段');
  // 注意：早期版本这里取了 r.name（列名），导致 cols 被当成「名字集合」而实际是「一列叫 name」，
  // 所有字段都被错位解析成整行原文。这里改成取列名本身，并顺带兼容那种把列名存进 name 列的结构。
  const list = rows.map(r => String(r.name));
  if (list.length === 1 && list[0] === 'name') {
    const probe = await db.prepare('SELECT * FROM scenery ORDER BY id LIMIT 1').all();
    const first = (probe.results || [])[0];
    if (first && typeof first.name === 'string' && first.name.indexOf(';') >= 0) {
      schemaCache = { at: now, columns: ['name'], set: new Set(['name']) };
      return schemaCache;
    }
  }
  schemaCache = { at: now, columns: list, set: new Set(list) };
  return schemaCache;
}

/** 把一行 D1 记录整理成前端需要的形状 */
function normalizeRow(row, cols) {
  const pick = (...names) => {
    for (const n of names) {
      if (cols.has(n) && row[n] !== null && row[n] !== undefined && String(row[n]) !== '') return String(row[n]);
    }
    return '';
  };

  // 1) 已经是分列的写法
  if (cols.has('rawProvince') || cols.has('raw_province') || cols.has('name')) {
    return {
      id: row.id ?? null,
      rawProvince: pick('rawProvince', 'raw_province', 'name', 'province', 'city'),
      author: pick('author'),
      freeLink: pick('freeLink', 'free_link'),
      freeLevel: pick('freeLevel', 'free_level'),
      paidLink: pick('paidLink', 'paid_link'),
      paidLevel: pick('paidLevel', 'paid_level'),
      remark: pick('remark', 'note', 'description'),
    };
  }

  // 2) 整行原文的写法：'省名;作者;免费链接;免费版本;付费链接;付费版本;备注'
  const line = pick('line', 'text', 'content', 'data', 'value');
  const parts = line.replace(/；/g, ';').split(';');
  return {
    id: row.id ?? null,
    rawProvince: (parts[0] || '').trim(),
    author: parts[1] || '',
    freeLink: parts[2] || '',
    freeLevel: parts[3] || '',
    paidLink: parts[4] || '',
    paidLevel: parts[5] || '',
    remark: parts.length > 6 ? parts.slice(6).join(';') : (parts[6] || ''),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 审核界面与提交接口走统一的错误包装（把 HttpError 变成 JSON）
    try {
      if (path === '/admin' || path === '/admin/') {
        return adminPage();
      }

      if (!env || !env.DB) {
        return json({ ok: false, error: 'Worker 没有绑定 D1：请确认 wrangler.toml 里 [[d1_databases]] binding = "DB"' }, 500);
      }

      if (path === '/api/submissions') {
        if (method !== 'POST') return json({ ok: false, error: 'Method Not Allowed' }, 405);
        return await handleSubmit(request, env);
      }

      if (path.startsWith('/api/admin/')) {
        if (method !== 'GET' && method !== 'POST') return json({ ok: false, error: 'Method Not Allowed' }, 405);
        await requireAdmin(request, env, url);

        if (path === '/api/admin/submissions' && method === 'GET') {
          return await handleAdminList(env, url);
        }
        const m = path.match(/^\/api\/admin\/submissions\/(\d+)\/(approve|reject)$/);
        if (m && method === 'POST') {
          const id = Number(m[1]);
          return m[2] === 'approve' ? await handleApprove(env, id) : await handleReject(env, id);
        }
        if (path === '/api/admin/backup') {
          return await handleBackup(env);
        }
        return json({ ok: false, error: 'Not Found' }, 404);
      }
    } catch (e) {
      if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
      return json({ ok: false, error: (e && e.message) || String(e) }, 500);
    }

    if (!env || !env.DB) {
      return json({ ok: false, error: 'Worker 没有绑定 D1：请确认 wrangler.toml 里 [[d1_databases]] binding = "DB"' }, 500);
    }

    // 健康检查：顺便列出库里现有的表，方便对表名
    if (path === '/' || path === '/api') {
      let tables = [];
      try {
        const r = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
        tables = (r.results || []).map(x => x.name);
      } catch (e) {
        return json({ ok: false, error: 'D1 绑定不可用：' + e.message, tables: [] }, 500);
      }
      return json({
        ok: true,
        service: 'horizonsimlabs-api',
        routes: [
          'GET  /api/landscapes',
          'POST /api/submissions',
          'GET  /api/admin/submissions?status=pending|approved|rejected|all',
          'POST /api/admin/submissions/:id/approve',
          'POST /api/admin/submissions/:id/reject',
          'POST /api/admin/backup',
        ],
        tables,
      });
    }

    if (path !== '/api/landscapes') {
      return json({ ok: false, error: 'Not Found' }, 404);
    }

    if (method !== 'GET') {
      return json({ ok: false, error: 'Method Not Allowed' }, 405);
    }

    try {
      const schema = await getSchema(env.DB);
      const cols = schema.set;

      const id = url.searchParams.get('id');
      let sql, args = [];
      if (id !== null) {
        sql = 'SELECT * FROM scenery WHERE id = ?';
        args = [id];
      } else {
        const country = url.searchParams.get('country');
        if (country && cols.has('country')) {
          sql = 'SELECT * FROM scenery WHERE country = ? ORDER BY id';
          args = [country];
        } else {
          sql = 'SELECT * FROM scenery ORDER BY id';
        }
      }

      const res = await env.DB.prepare(sql).bind(...args).all();
      const data = (res.results || []).map(r => normalizeRow(r, cols));
      return json({ ok: true, count: data.length, data });
    } catch (e) {
      return json({ ok: false, error: e && e.message ? e.message : String(e) }, 500);
    }
  },
};
