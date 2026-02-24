const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const title = '原理篇五：从"被动响应"到"主动出击"——Heartbeat 唤醒与后台任务机制';
  const content = `# 原理篇五：从"被动响应"到"主动出击"——Heartbeat 唤醒与后台任务机制

大多数 AI 助手都是"被动"的：你问，它答；你不问，它沉默。

OpenClaw 有一个让我觉得最惊艳的特性：**它会主动找你**。

这背后的机制叫 **Heartbeat（心跳）**。

---

## 什么是 Heartbeat？

Heartbeat 是一种定时唤醒机制。系统按照设定的时间间隔（比如每 30 分钟），自动触发一次 AI 会话，让 AI 执行一系列预设的检查任务。

如果 AI 发现有值得通知的事情，它会主动发消息给你。如果没有，它就静默地回到"睡眠"状态，等待下一次心跳。

这个设计把 AI 从"响应式工具"变成了"主动代理"——它不再只是等你发号施令，而是在后台持续关注你关心的事情。

---

## Heartbeat 的工作流程

每次心跳触发时，AI 会执行以下流程：

\`\`\`
[定时器触发]
    ↓
[读取 HEARTBEAT.md] — 获取当前的检查任务清单
    ↓
[执行检查任务]
  - 检查未读邮件
  - 查看日历事件
  - 监控特定网页变化
  - 检查服务器状态
  - 查看 GitHub 通知
  - ...（任何你配置的任务）
    ↓
[判断是否需要通知]
  - 有重要邮件？→ 发消息给你
  - 有即将到来的会议？→ 提前提醒
  - 网页内容变化？→ 推送更新
  - 一切正常？→ 静默，回复 HEARTBEAT_OK
    ↓
[更新心跳状态文件]
\`\`\`

整个过程完全自动，不需要你的任何干预。

---

## HEARTBEAT.md：你的"AI 值班表"

HEARTBEAT.md 是心跳任务的配置文件，由你（或 AI）编写和维护。

一个典型的 HEARTBEAT.md 可能长这样：

\`\`\`markdown
# 心跳检查清单

## 每次检查
- 检查是否有未读的重要邮件（发件人包含：老板、客户）
- 查看今天剩余的日历事件

## 每天上午 9 点
- 汇总昨天的工作进展
- 提醒今日待办事项

## 每周一
- 检查项目 GitHub Issues 的新动态
- 生成上周工作周报草稿

## 监控任务
- 监控 https://example.com/status 页面，如有变化立即通知
\`\`\`

这个文件完全由你控制，想监控什么、多久检查一次，都可以自定义。

---

## Cron Jobs：精确定时的后台任务

除了 Heartbeat 这种"批量检查"模式，OpenClaw 还支持 **Cron Jobs**——精确到分钟的定时任务。

Heartbeat 和 Cron 的区别：

| | Heartbeat | Cron Job |
|---|---|---|
| 触发方式 | 定时轮询，可以漂移 | 精确时间点 |
| 适用场景 | 批量检查、可以合并 | 精确提醒、独立任务 |
| 上下文 | 共享主会话历史 | 独立会话 |
| 配置方式 | HEARTBEAT.md | 系统 crontab |

比如"每天早上 8:50 提醒我 9 点有会议"这种需求，用 Cron Job 更合适——它需要精确的时间点，而不是"大概 30 分钟后"。

---

## 实际应用场景

Heartbeat 机制能做的事情，远比你想象的多：

**个人助理场景：**
- 监控重要邮件，过滤垃圾，只推送真正重要的
- 提前 30 分钟提醒即将到来的会议
- 每天晚上总结当天的工作，生成日报

**开发者场景：**
- 监控 CI/CD 流水线状态，失败时立即通知
- 定期检查服务器资源使用情况
- 监控 GitHub PR 的 review 状态

**信息监控场景：**
- 监控竞品网站的价格变化
- 追踪特定关键词的新闻
- 监控 API 接口的可用性

**家庭场景：**
- 监控家庭服务器的运行状态
- 提醒家庭成员的重要日程
- 定期备份重要文件

---

## 心跳状态管理：避免重复通知

一个容易被忽视的细节：如果 AI 每次心跳都检查同一封邮件，它会不会反复通知你？

OpenClaw 通过**心跳状态文件**解决这个问题。每次检查后，AI 会记录已处理的事项：

\`\`\`json
{
  "lastChecks": {
    "email": 1708000000,
    "calendar": 1708000000,
    "github": 1707950000
  },
  "processedItems": {
    "emails": ["msg_id_123", "msg_id_456"],
    "events": ["event_id_789"]
  }
}
\`\`\`

下次心跳时，AI 会对比这个状态，只处理新出现的事项，避免重复打扰。

---

## 主动 AI 的哲学：从工具到伙伴

我想在这里说一个更深层的观点。

传统的 AI 工具是"工具"——你用它，它才工作。Heartbeat 机制让 OpenClaw 更像一个"伙伴"——它有自己的节奏，会主动关注你关心的事情，在你需要的时候出现。

这个转变看起来只是技术细节，但它改变了人与 AI 的关系模式。

当 AI 会主动说"你有一封重要邮件需要处理"或者"你明天有个早会，要不要我帮你准备材料"，它就不再只是一个等待指令的工具，而是一个真正在帮你管理生活的助手。

这种"主动性"，是我认为 OpenClaw 最值得深入探索的特性。`;
  const summary = '解析 OpenClaw 最惊艳的主动能力：Heartbeat 模式下 AI 如何在后台定期唤醒、执行 Cron Jobs、监控邮件与数据流，并主动发起对话。';
  const slug = 'openclaw-series-6-' + Date.now().toString(36);

  const article = await prisma.article.create({
    data: { title, content, summary, slug, authorId: 1, categoryId: 1, published: true, coverImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800' }
  });
  console.log('发布成功：' + article.id + ' -> https://ai-news-hub-next.vercel.app/article/' + article.slug);

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.VOYAGE_API_KEY },
    body: JSON.stringify({ model: 'voyage-3', input: [title + '\n\n' + content], input_type: 'document' })
  });
  const data = await res.json();
  const embedding = data.data[0].embedding;
  await prisma.$executeRawUnsafe('UPDATE "Article" SET embedding = $1::vector WHERE id = $2', '[' + embedding.join(',') + ']', article.id);
  console.log('embedding 完成');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
