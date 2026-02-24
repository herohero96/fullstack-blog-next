const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const title = '原理篇四：AI 的记忆法则——八大系统提示词注入与上下文持久化';
  const content = `# 原理篇四：AI 的记忆法则——八大系统提示词注入与上下文持久化

大模型有个根本性的局限：**它没有记忆**。每次对话都是全新开始，它不知道你是谁，不记得上次说了什么，也不了解你的偏好。

OpenClaw 用一套精心设计的"记忆注入"机制解决了这个问题。理解这套机制，你才能真正掌控 AI 助手的行为。

---

## 会话启动：AI 的"早晨仪式"

每次 OpenClaw 启动一个新会话，它不是直接把你的消息扔给模型，而是先执行一套初始化流程——我把它叫做"早晨仪式"。

这个流程的核心是：**从本地文件系统读取一系列 .md 文件，动态拼装成系统提示词（System Prompt），注入到模型的上下文开头**。

这些文件就是 AI 的"记忆载体"。

---

## 八大注入文件

OpenClaw 的系统提示词由多个文件组合而成，每个文件承担不同的角色：

**1. SOUL.md — 灵魂文件**
定义 AI 的核心人格、价值观、行为准则。这是最稳定的部分，通常不会频繁修改。

示例内容：
\`\`\`
你是一个务实、直接的 AI 助手。
你不说废话，不过度道歉，不假装热情。
你把用户的时间当作最宝贵的资源。
\`\`\`

**2. USER.md — 用户档案**
记录用户的基本信息、偏好、习惯。AI 通过这个文件"认识"你。

\`\`\`
用户：张三
职业：后端工程师，主要用 Python 和 Go
偏好：简洁回答，不需要解释基础概念
时区：Asia/Shanghai
\`\`\`

**3. MEMORY.md — 长期记忆**
AI 的"人生经历"——重要事件、决策、学到的教训。这个文件由 AI 自己维护，随着使用积累越来越丰富。

**4. AGENTS.md — 工作规范**
定义 AI 在这个工作空间的行为规范：如何管理文件、何时主动行动、安全边界在哪里。

**5. TOOLS.md — 工具备忘录**
记录环境特定的工具配置：SSH 主机别名、摄像头名称、API 端点等。

**6. HEARTBEAT.md — 心跳任务清单**
定义 AI 在后台定期执行的检查项目（下一篇会详细讲）。

**7. 每日记忆文件 — memory/YYYY-MM-DD.md**
当天和昨天的原始日志，提供近期上下文。

**8. 动态上下文 — 实时注入**
根据当前任务动态添加的内容，比如当前打开的文件、正在执行的项目信息等。

---

## 动态拼装：不是简单的文件拼接

这些文件不是简单地首尾相接，而是经过智能处理：

**条件注入**：某些文件只在特定条件下注入。比如 MEMORY.md 只在主会话（直接对话）中注入，在群聊或共享场景中不注入——防止私人信息泄露给陌生人。

**大小控制**：每个文件都有大小限制。如果文件太大，会被截断或摘要化，确保总 token 数在模型的上下文窗口内。

**优先级排序**：不同文件的内容有优先级。SOUL.md 的指令优先级最高，日常记忆文件优先级较低。

**时间感知**：系统会自动注入当前时间、日期、星期，让 AI 有基本的时间感知。

---

## JSONL：会话状态的本地存储

除了系统提示词，OpenClaw 还需要持久化**对话历史**——这样即使重启，AI 也能"记得"之前说了什么。

存储格式是 **JSONL（JSON Lines）**：每行一个 JSON 对象，代表一条消息。

\`\`\`jsonl
{"role":"user","content":"帮我分析一下这份报告","timestamp":1708000000}
{"role":"assistant","content":"好的，我来看看...","timestamp":1708000005}
{"role":"tool","name":"read","result":"报告内容...","timestamp":1708000006}
{"role":"assistant","content":"分析完成，主要发现如下...","timestamp":1708000020}
\`\`\`

JSONL 格式的优点：
- **追加写入**：不需要重写整个文件，直接在末尾追加
- **流式读取**：可以逐行读取，不需要把整个文件加载到内存
- **易于调试**：人类可读，方便排查问题

每个会话对应一个 JSONL 文件，按日期或会话 ID 命名，存储在本地。

---

## 记忆的层次结构

把上面的内容整理一下，OpenClaw 的记忆系统是分层的：

\`\`\`
第一层：永久记忆（SOUL.md, USER.md）
  → 几乎不变，定义 AI 的基本特征

第二层：长期记忆（MEMORY.md）
  → 缓慢积累，记录重要事件和学习

第三层：近期记忆（memory/YYYY-MM-DD.md）
  → 每天更新，记录近期活动

第四层：工作记忆（当前会话 JSONL）
  → 实时更新，当前对话的完整历史

第五层：即时上下文（动态注入）
  → 按需加载，当前任务相关信息
\`\`\`

这个层次结构和人类记忆的工作方式惊人地相似：有深层的价值观和人格（不易改变），有人生经历（缓慢积累），有近期记忆（容易访问），有工作记忆（当前任务）。

---

## 为什么这个设计比"云端记忆"更好？

很多 AI 服务也提供"记忆功能"，但通常是把对话摘要存在云端服务器。OpenClaw 的本地文件方案有几个明显优势：

**完全可控**：你可以直接编辑这些 .md 文件，精确控制 AI 知道什么、不知道什么。

**隐私安全**：记忆数据存在你自己的机器上，不经过任何第三方服务器。

**可移植**：这些文件就是普通的 Markdown，可以备份、迁移、版本控制。

**透明可审计**：AI 的"记忆"完全可见，没有黑盒。

我个人觉得这是 OpenClaw 最被低估的设计之一。能够直接编辑 AI 的记忆文件，意味着你对 AI 行为有真正的掌控权——而不是依赖一个你看不见、摸不着的云端"记忆系统"。`;
  const summary = '揭秘 OpenClaw 每次会话的启动流程，解析如何动态注入 SOUL、USER、MEMORY、HEARTBEAT 等 8 个 .md 文件，以及会话状态的本地 JSONL 存储原理。';
  const slug = 'openclaw-series-5-' + Date.now().toString(36);

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
