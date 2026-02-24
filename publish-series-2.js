const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const title = '原理篇一：全渠道无缝接入——揭秘 Gateway 网关与消息路由机制';
  const content = `# 原理篇一：全渠道无缝接入——揭秘 Gateway 网关与消息路由机制

如果你用过 OpenClaw，一定体验过这种感觉：在 Telegram 上发一条消息，AI 就开始帮你执行任务；切换到飞书，它还在那里，状态完整，记忆连贯。这背后的核心，就是 Gateway 网关。

今天我们来拆开这个"黑盒子"，看看它到底是怎么工作的。

---

## Gateway 是什么？

简单说，Gateway 是 OpenClaw 的"通信枢纽"——一个常驻后台的守护进程（daemon）。

它的职责是：**把来自不同渠道的消息，统一翻译成 AI 能理解的格式，再把 AI 的回复路由回对应的渠道**。

你可以把它想象成一个电话总机。WhatsApp 打来的电话、Telegram 发来的短信、飞书推送的通知，全部汇聚到这里，由 Gateway 统一接待、分发、回复。

---

## 守护进程：永不下线的后台服务

Gateway 以守护进程的形式运行，这意味着它不依赖任何前台窗口，开机自启，静默运行。

\`\`\`bash
openclaw gateway start   # 启动
openclaw gateway status  # 查看状态
openclaw gateway stop    # 停止
\`\`\`

这种设计有个关键好处：**AI 的"在线状态"与你的操作无关**。你关掉终端、锁屏、甚至睡觉，Gateway 依然在监听消息、处理任务。这是实现"主动 AI"的基础——后面的 Heartbeat 篇会深入讲这个。

从技术角度看，Gateway 本质上是一个 Node.js 进程，通过 pm2 或系统 systemd 管理生命周期，监听本地端口，同时维护与各平台 API 的长连接（WebSocket 或轮询）。

---

## 多渠道接入：统一抽象层

OpenClaw 支持接入的渠道包括但不限于：

- **Telegram**（Bot API，最稳定）
- **WhatsApp**（通过 Baileys 或官方 Cloud API）
- **飞书 / Lark**（企业 IM，支持机器人）
- **Discord**（社区场景）
- **SMS / 邮件**（轻量接入）

每个渠道的协议完全不同：Telegram 用 HTTP Long Polling 或 Webhook，WhatsApp 用 WebSocket，飞书用事件订阅……

Gateway 的核心设计是**渠道适配器（Channel Adapter）模式**。每个渠道对应一个适配器模块，负责：

1. 建立与平台的连接
2. 接收原始消息，解析为统一的内部格式（IncomingMessage）
3. 将 AI 回复的统一格式（OutgoingMessage）转换为平台特定的 API 调用

这样，AI 核心层完全不需要知道消息来自哪个平台——它只处理标准化的消息对象。

---

## 身份验证：谁在和 AI 说话？

这是一个容易被忽视但极其重要的问题。

当一条消息到达 Gateway，它必须回答：**这个人是谁？他有权限做什么？**

OpenClaw 的身份验证机制分两层：

**第一层：渠道身份绑定**

每个渠道账号（比如你的 Telegram user_id）在首次使用时需要完成绑定。Gateway 会记录这个映射关系：\`telegram:123456789 → user:alice\`。

这个绑定存储在本地数据库（SQLite 或配置文件），不上传云端。

**第二层：权限级别**

绑定后，用户被分配权限级别：
- \`owner\`：完全控制，可执行任意命令
- \`trusted\`：可使用大部分功能，但有沙箱限制
- \`guest\`：只能使用预设的受限功能

这个设计让 OpenClaw 可以安全地开放给家庭成员或团队协作——你的 AI 助手，但不是所有人都能"root"它。

---

## 多用户隔离：你的上下文，只属于你

如果多个人同时在和同一个 OpenClaw 实例对话，会发生什么？

Gateway 通过**会话隔离**解决这个问题。每个用户维护独立的：

- 对话历史（context window）
- 工作目录（workspace）
- 内存文件（MEMORY.md）
- 任务队列

技术实现上，Gateway 为每个活跃用户维护一个独立的 Agent 实例，或者通过 session_id 在共享 Agent 中隔离上下文。消息路由时，Gateway 根据发送者身份查找对应的 session，确保 Alice 的消息不会混入 Bob 的上下文。

这个隔离机制在家庭场景下尤其重要：你的 AI 知道你的日程、偏好、私人文件，但你的孩子用同一个 Telegram 机器人时，看不到这些。

---

## 消息路由的完整流程

把上面的内容串起来，一条消息的完整旅程是这样的：

\`\`\`
[用户] Telegram 发消息
    ↓
[Gateway] Telegram 适配器接收，解析为 IncomingMessage
    ↓
[Gateway] 身份验证：查找 telegram:user_id → 内部用户
    ↓
[Gateway] 权限检查：该用户是否有权执行此操作？
    ↓
[Gateway] 路由到对应的 Agent 会话（按 session_id 隔离）
    ↓
[Agent] 处理消息，调用工具，生成回复
    ↓
[Gateway] 将回复通过 Telegram 适配器发回
    ↓
[用户] 收到回复
\`\`\`

整个过程通常在几百毫秒内完成（不含 AI 推理时间）。

---

## 为什么这个设计很重要？

很多人把 OpenClaw 理解为"一个聊天机器人"，但 Gateway 的存在说明它的定位远不止于此。

**渠道无关性**意味着你可以随时切换控制终端，不丢失任何状态。出门用手机 Telegram，回家用电脑飞书，AI 的记忆和任务状态完全连续。

**多用户支持**意味着它可以服务一个小团队，而不只是个人助手。

**守护进程模式**意味着 AI 可以在你不在线时继续工作——这是从"工具"到"代理"的关键跨越。

Gateway 看起来只是个"消息中转站"，但它实际上定义了 OpenClaw 的使用边界：**不是一个你打开才能用的应用，而是一个永远在线、随时响应的个人 AI 基础设施**。

这个区别，比任何功能都重要。`;
  const summary = '深度解析 OpenClaw Gateway 后台守护进程，讲解单节点状态管理、身份验证、多用户隔离，以及如何将 WhatsApp、Telegram、飞书等转化为 AI 控制终端。';
  const slug = 'openclaw-series-2-' + Date.now().toString(36);

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
