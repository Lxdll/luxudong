# 鲁旭东个人网站 AI 助手

这是个人网站 RAG 助手对应的 Cloudflare Worker。模型推理不会占用现有的
2 核 2G VPS，主要使用以下 Cloudflare 服务：

- Workers AI：运行 `@cf/qwen/qwen3-embedding-0.6b` Embedding 模型。
- Workers AI：运行 `@cf/qwen/qwen3-30b-a3b-fp8` 生成模型。
- Vectorize：保存向量并完成语义检索。
- D1 + FTS5：保存知识片段、进行关键词检索、记录索引状态和匿名用量。
- Turnstile：防止公开聊天接口被机器人滥用。

访客的问题和回答不会写入 D1，也不会记录到应用日志。D1 中只保存公开知识和匿名用量汇总。

## 一、准备工作

进入 Worker 目录并安装依赖：

```bash
cd ai-worker
npm ci
```

登录 Cloudflare：

```bash
npx wrangler login
```

浏览器会打开 Cloudflare 授权页面。完成授权后，Wrangler 才能创建和部署资源。

> 注意：除非命令中明确写了 `--config ai-worker/wrangler.jsonc`，本文的 `npx wrangler ...` 命令都需要在 `ai-worker` 目录中执行。如果终端提示符仍显示仓库根目录 `luxudong`，请先运行 `cd ai-worker`。

## 二、创建 D1 数据库

执行：

```bash
npx wrangler d1 create luxudong-ai
```

命令执行成功后会返回类似下面的信息：

```text
database_name = "luxudong-ai"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

打开 `ai-worker/wrangler.jsonc`，找到：

```jsonc
"database_id": "REPLACE_WITH_D1_DATABASE_ID"
```

将占位内容替换成刚刚返回的真实 `database_id`。数据库 ID 不是密码，可以提交到代码仓库。

## 三、创建 Vectorize 向量索引

执行：

```bash
npx wrangler vectorize create luxudong-knowledge --dimensions=1024 --metric=cosine
```

这里必须保持：

- 索引名称：`luxudong-knowledge`
- 向量维度：`1024`
- 距离算法：`cosine`

这些参数需要和 `Qwen3-Embedding-0.6B` 及 `wrangler.jsonc` 中的配置一致。

## 四、创建 Turnstile

1. 登录 Cloudflare Dashboard。
2. 进入 **Turnstile**。
3. 创建一个新站点。
4. 站点名称可以填写 `luxudong-ai-assistant`。
5. 域名添加：
   - `luxudong.me`
   - `www.luxudong.me`
6. Widget Mode 使用 Cloudflare 推荐的托管模式。
7. 创建后保存下面两个值：
   - `Site Key`：公开值，提供给网站前端。
   - `Secret Key`：私密值，只能提供给 Worker 和 GitHub Actions。

## 五、配置 Worker 密钥

先准备一个用于保护知识库重建接口的随机密钥。例如：

```bash
openssl rand -hex 32
```

然后分别写入两个 Worker Secret：

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put REINDEX_SECRET
```

Wrangler 提示输入值时：

- `TURNSTILE_SECRET_KEY` 填写 Turnstile 的 `Secret Key`。
- `REINDEX_SECRET` 填写刚刚生成的随机字符串。

不要把这两个值写进 `wrangler.jsonc`、`.env` 或 Git 提交记录。

如果你希望留在仓库根目录，也可以显式指定 Worker 配置文件：

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --config ai-worker/wrangler.jsonc
npx wrangler secret put REINDEX_SECRET --config ai-worker/wrangler.jsonc
```

## 六、检查个人知识库

个人档案、职业经历和项目数据位于：

```text
content/knowledge.json
```

在仓库根目录运行：

```bash
npm run knowledge:check:strict
```

看到下面的结果才可以继续上线：

```text
Knowledge profile is ready for AI indexing.
```

如果仍有“待补充”字段，严格检查会失败，AI Worker 的生产部署也会被阻止。

## 七、验证代码并初始化 D1

在 `ai-worker` 目录执行：

```bash
npm run typecheck
npm test
npx wrangler d1 migrations apply luxudong-ai --remote
```

最后一条命令会在远程 D1 中创建：

- 知识片段表。
- FTS5 全文检索表。
- 索引同步状态表。
- 匿名每日用量表。

第一次执行迁移时，Wrangler 会要求确认，输入 `y` 即可。

## 八、部署 Worker

执行：

```bash
npm run deploy
```

部署成功后，Cloudflare 会返回一个地址，例如：

```text
https://luxudong-ai-assistant.<你的子域>.workers.dev
```

先检查服务是否正常：

```bash
curl https://luxudong-ai-assistant.<你的子域>.workers.dev/health
```

预期返回：

```json
{"status":"ok"}
```

如果在使用本地代理时出现 `SSL handshake failure`，但 Wrangler 可以正常部署，可以让 `curl` 通过 SOCKS5 代理在远端解析域名。例如本地代理端口为 `7890` 时：

```bash
curl --socks5-hostname 127.0.0.1:7890 \
  https://luxudong-ai-assistant.<你的子域>.workers.dev/health
```

如果这条命令能返回 `{"status":"ok"}`，说明 Worker 本身正常，问题来自本机 DNS 或代理分流。可以在代理软件中将 `workers.dev` 域名后缀强制交给代理节点，并避免使用本地污染或错误的 DNS 结果。

## 九、首次建立知识索引

使用第五步配置的 `REINDEX_SECRET` 调用重建接口：

```bash
curl --fail-with-body \
  -X POST "https://luxudong-ai-assistant.<你的子域>.workers.dev/internal/reindex" \
  -H "Authorization: Bearer <你的 REINDEX_SECRET>"
```

成功后会返回文档数、知识片段数、更新数量和耗时。

Worker 还配置了每小时一次的 Cron。后续在 Directus 发布、修改或取消发布文章后，
Worker 会自动同步博客内容，不需要每次手动重建。

## 十、检查 AI 是否已经准备好

执行：

```bash
curl https://luxudong-ai-assistant.<你的子域>.workers.dev/v1/meta
```

重点确认：

```json
{
  "ready": true,
  "profileReady": true
}
```

只有 `ready` 为 `true`，才应该在网站中显示 AI 助手入口。

## 十一、配置 GitHub Actions

进入 GitHub 仓库：

```text
Settings → Secrets and variables → Actions
```

### Repository variables

添加以下公开变量：

| 名称 | 值 |
| --- | --- |
| `AI_ASSISTANT_ENABLED` | 首次配置时填 `false`，全部验证通过后改成 `true` |
| `AI_API_URL` | 完整的 Worker 地址，不要在末尾添加 `/` |
| `TURNSTILE_SITE_KEY` | Turnstile 的公开 Site Key |

### Repository secrets

添加以下私密值：

| 名称 | 来源 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard 中的 Account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token，需要具备部署 Workers、操作 D1 和 Vectorize 的权限 |
| `TURNSTILE_SECRET_KEY` | Turnstile 的 Secret Key |
| `AI_REINDEX_SECRET` | 与 Worker 中 `REINDEX_SECRET` 完全相同的随机字符串 |

`AI_REINDEX_SECRET` 和 Worker 的 `REINDEX_SECRET` 名称不同，但值必须一致。

## 十二、正式启用网站入口

确认以下条件全部满足：

- `npm run knowledge:check:strict` 通过。
- Worker 部署成功。
- D1 迁移成功。
- 首次知识索引建立成功。
- `/health` 返回正常。
- `/v1/meta` 中 `ready` 为 `true`。
- Turnstile 已限制为个人网站域名。

然后把 GitHub Repository variable：

```text
AI_ASSISTANT_ENABLED
```

改成：

```text
true
```

再次触发主分支部署后，网站右下角才会显示 AI 助手。变量保持 `false` 时，
即使前端代码和 Worker 已部署，访客也看不到尚未准备好的入口。

## 本地开发

复制本地变量模板：

```bash
cp .dev.vars.example .dev.vars
```

本地迁移并启动 Worker：

```bash
npx wrangler d1 migrations apply luxudong-ai --local
npm run dev
```

`.dev.vars` 只用于本地开发，已经被 Git 忽略，不要提交到仓库。

前端本地环境变量可以参考仓库根目录的 `.env.example`。本地联调时可以设置：

```text
VITE_AI_ASSISTANT_ENABLED=true
VITE_AI_API_URL=http://localhost:8787
VITE_TURNSTILE_SITE_KEY=<你的 Site Key>
```

如果本地 Worker 设置了 `TURNSTILE_BYPASS=true`，可以绕过 Turnstile 方便调试；
生产环境必须保持 `TURNSTILE_BYPASS=false`。

## 常见问题

### 部署时报 D1 database ID 无效

检查 `wrangler.jsonc` 中是否仍然是：

```text
REPLACE_WITH_D1_DATABASE_ID
```

需要替换为执行 `wrangler d1 create luxudong-ai` 后获得的真实 ID。

### `/v1/meta` 中 `ready` 是 `false`

依次检查：

1. `knowledge.json` 是否通过严格校验。
2. 是否成功执行 D1 远程迁移。
3. 是否调用过 `/internal/reindex`。
4. Directus 是否能够正常访问已发布文章。
5. Workers AI 和 Vectorize 是否创建在同一个 Cloudflare 账号中。

### 网站没有显示 AI 助手

检查 GitHub Repository variables：

- `AI_ASSISTANT_ENABLED` 是否为字符串 `true`。
- `AI_API_URL` 是否是正确的 Worker 地址。
- `TURNSTILE_SITE_KEY` 是否已经配置。

任意一项缺失时，前端都会隐藏 AI 助手入口。
