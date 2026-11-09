# 地景数据 API + 上传审核 说明

本站地景数据存在 Cloudflare D1 里，前端通过一个独立 Worker 读取和提交：

- 读取：`GET https://horizonsimlabs-api.seeout360.workers.dev/api/landscapes`
- 提交：`POST https://horizonsimlabs-api.seeout360.workers.dev/api/submissions`
- 审核：`https://horizonsimlabs-api.seeout360.workers.dev/admin`（需要口令）

本目录的文件：

| 文件 | 作用 |
| --- | --- |
| `wrangler.toml` | Worker 配置：`name = "horizonsimlabs-api"`，已绑定现有 D1（`database_id 10ddc8fd-...`） |
| `src/index.js` | Worker 入口：地景接口 + 提交接口 + 审核接口 + 内置审核页面 |
| `seed.sql` | `scenery` 表的建表语句 + 由 done.json 生成的 67 条数据 |

---

## 接口一览

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/landscapes` | 无 | 地图用，返回全部已通过的地景，支持 `?id=` |
| POST | `/api/submissions` | 无 | 用户提交，写入 `submissions` 表，状态 `pending` |
| GET | `/api/admin/submissions?status=pending\|approved\|rejected\|all` | 口令 | 审核列表 |
| POST | `/api/admin/submissions/:id/approve` | 口令 | 通过：写入 `scenery` 表，地图上立刻出现 |
| POST | `/api/admin/submissions/:id/reject` | 口令 | 拒绝：只改状态，不入库 |
| POST | `/api/admin/backup` | 口令 | 导出 `scenery` 表为 SQL |
| GET | `/admin` | — | 审核页面（自带口令登录） |

口令的三种传法都支持：`X-Admin-Token: <token>` 头、`Authorization: Bearer <token>`、`?token=<token>`。

---

## 首次部署（只需做一次）

### 1. 设置管理员口令

口令不写在代码里，存在 Cloudflare 的 Secret 里：

```bash
cd worker
npx wrangler secret put ADMIN_TOKEN
# 提示时输入你自己的口令，例如一个 30 位以上的随机字符串
```

> 没配置时审核接口会返回 503 并提示怎么配，不会静默失效。

### 2. 部署 Worker

```bash
npx wrangler deploy
```

部署完打开 `https://horizonsimlabs-api.seeout360.workers.dev/`，应看到：

```json
{ "ok": true, "service": "horizonsimlabs-api", "routes": [ ...7 条... ], "tables": ["scenery", ...] }
```

`routes` 里能看到 `/api/submissions`、`/api/admin/...` 就说明新版已经上线。

### 3. 建表并灌入现有地景

`submissions` 表会在第一次提交时自动创建，`scenery` 表需要先建：

```bash
npx wrangler d1 execute twikoo --remote --file=./worker/seed.sql
```

`seed.sql` 里带 `DELETE FROM scenery;`，重复执行是整表重灌，不会重复插入。

---

## 日常审核流程

1. 打开 `https://horizonsimlabs-api.seeout360.workers.dev/admin`
2. 输入 `ADMIN_TOKEN`，进入后默认显示「待审核」
3. 每条记录都能看到链接和备注，点 **通过** 会写进 `scenery` 表，地图立刻点亮；点 **拒绝** 只是标记状态
4. 顶部「待审核 / 已通过 / 已拒绝」可切换，右上角「备份 scenery」可随时导出一份 SQL 存底

页面是 `noindex, nofollow`，搜索引擎不会收录；口令只存在浏览器的 `sessionStorage` 里，关掉标签页即失效。

---

## 用户提交的规则

前端（`index.html` 左上角「上传你自己的地景插件」）和后端都会校验，后端为准。

**七个字段全部必填**，没有的那一项就填 **`无|None`**（中文|英文，和 `done.json` 里的历史数据完全一致）：

| 字段 | 说明 |
| --- | --- |
| 地景名称 | ≤60 字，不能含分号（`;` 或 `；`）——`scenery` 旧格式用分号分隔，写了会污染整行。写城市或地区名，如「上海」「兰州」 |
| 作者 | ≤60 字，没有写 `无|None` |
| 免费版链接 | 以 `http://` 或 `https://` 开头，没有写 `无|None` |
| 免费版等级 | 如 `12`，没有写 `无|None`；≤40 字 |
| 付费版链接 | 同上 |
| 付费版等级 | 同上 |
| 备注 | ≤500 字，没有写 `无|None`。**需中英双文，格式「中文\|英文」**；支持 AF4 或双端支持要写明，只支持 AFG 不用特殊写 |

**为什么是 `无|None`**：地图页用 `parseBilingual()` 按 `|` 拆开 —— 中文界面显示「无」，切到英文界面显示「None」。只写「无」在英文页会露出中文，只写 `None` 在中文页会露出英文，所以必须写全。

为了方便，填写时只写「无」「None」「无/None」等也会被接受，入库前统一规范成 `无|None`，数据库里只有一种写法。

额外限制：

- **免费版链接和付费版链接至少要有一个真实链接**（两个都填 `无|None` 会被拒，因为地图上点了没东西可下）
- 同一 IP 每小时最多提交 5 次（Worker 内存限流，重启即清零）

---

## 数据安全

- 提交先进 `submissions` 表，**不会**直接影响地图；只有点「通过」才写入 `scenery`
- 重复点「通过」返回 409，不会重复入库
- 口令比对用 SHA-256 哈希后比较，不走明文比较
- 建议定期用「备份 scenery」导出 SQL，或 `npx wrangler d1 export twikoo --output=backup.sql`

---

## 前端改了什么

12 个国家页（`scenery/{au,bt,cn,is,dk,kp,my,sg,jp,tr,kr,nz}.html`）都做了同样的三处改动：

1. 新增 `const LANDSCAPES_API = 'https://horizonsimlabs-api.seeout360.workers.dev/api/landscapes';` 和 `fetchLandscapes()`
2. 原来的 `fetch('../done.json?t=' + Date.now())` 改成 `fetchLandscapes()`
3. `parseDoneJson()` 现在既能解析接口返回的 `{ ok, count, data[] }` 对象，也能解析 done.json 原始文本

首页 `index.html` 新增了左上角的「上传你自己的地景插件」按钮与提交弹窗，提交到 `/api/submissions`。

**容错**：接口失败（500 / 网络错误 / 格式不对）时自动回落到 `../done.json`，页面不会白板。
等确认 D1 稳定后，可以删掉 `fetchLandscapes()` 里的 catch 回落分支和 `done.json`。
