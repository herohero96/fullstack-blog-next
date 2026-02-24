const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const title = '实践篇：零成本打造专属智能管家——OpenClaw 本地部署与生态整合';
  const content = `# 实践篇：零成本打造专属智能管家——OpenClaw 本地部署与生态整合

前六篇我们把 OpenClaw 的原理拆了个底朝天：Gateway 网关、Agent Stack、Skill 系统、记忆机制、Heartbeat 唤醒、安全沙箱……

现在是时候动手了。

这篇文章是整个系列的落地实践，目标是：**用最低成本，在你自己的机器上部署一个功能完整的 AI 助手**。

---

## 准备工作：你需要什么？

**硬件要求（最低配置）：**
- 任何能运行 Node.js 的机器（树莓派 4 也行）
- 如果要跑本地大模型：建议 16GB 内存，有 GPU 更好
- 稳定的网络连接（用于 IM 渠道接入）

**软件依赖：**
- Node.js 18+
- Git
- （可选）Docker，用于隔离运行环境
- （可选）Ollama，用于本地大模型

**账号准备：**
- Telegram 账号（用于创建 Bot）
- 至少一个 AI 模型 API Key（Claude / OpenAI / DeepSeek 任选其一）

---

## 第一步：安装 OpenClaw

\`\`\`bash
# 通过 npm 全局安装
npm install -g openclaw

# 验证安装
openclaw --version

# 初始化工作空间
openclaw init
\`\`\`

初始化会在 \`~/.openclaw/workspace/\` 创建基础文件结构：

\`\`\`
~/.openclaw/workspace/
├── SOUL.md          # AI 人格定义
├── USER.md          # 你的个人档案
├── MEMORY.md        # 长期记忆（初始为空）
├── AGENTS.md        # 工作规范
├── TOOLS.md         # 工具配置备忘
└── memory/          # 每日记忆目录
\`\`\`

---

## 第二步：配置 AI 模型

编辑 \`~/.openclaw/config.yaml\`：

\`\`\`yaml
models:
  default: claude-sonnet-4  # 默认模型
  
  providers:
    anthropic:
      api_key: "sk-ant-..."
      models:
        - claude-sonnet-4
        - claude-haiku-3
    
    openai:
      api_key: "sk-..."
      models:
        - gpt-4o
        - gpt-4o-mini
    
    deepseek:
      api_key: "sk-..."
      base_url: "https://api.deepseek.com"
      models:
        - deepseek-chat
    
    # 本地模型（零成本！）
    ollama:
      base_url: "http://localhost:11434"
      models:
        - qwen2.5:14b
        - llama3.2:3b

# 路由规则（可选）
routing:
  - pattern: ".*代码.*|.*编程.*"
    model: claude-sonnet-4
  - pattern: ".*中文.*|.*写作.*"
    model: deepseek-chat
  - pattern: ".*私密.*|.*隐私.*"
    model: ollama/qwen2.5:14b  # 敏感内容走本地
\`\`\`

---

## 第三步：接入 Ollama 本地大模型（零 API 费用）

如果你想完全免费运行，Ollama 是最佳选择。

**安装 Ollama：**

\`\`\`bash
# macOS / Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows：下载安装包 https://ollama.ai/download
\`\`\`

**下载模型：**

\`\`\`bash
# 推荐：Qwen2.5 14B（中文能力强，需要约 9GB 显存或 16GB 内存）
ollama pull qwen2.5:14b

# 轻量版：适合低配机器（4GB 内存可运行）
ollama pull qwen2.5:3b

# 代码专用
ollama pull qwen2.5-coder:7b

# 验证运行
ollama run qwen2.5:14b "你好，介绍一下你自己"
\`\`\`

**在 OpenClaw 中使用本地模型：**

\`\`\`bash
# 临时切换
/model ollama/qwen2.5:14b

# 或在对话中指定
"用本地模型帮我分析这份文档"
\`\`\`

本地模型的优势：零成本、数据不出本机、无速率限制。劣势：速度较慢，能力弱于顶级云端模型。

---

## 第四步：接入 Telegram Bot

Telegram 是最容易配置的渠道，也是最稳定的。

**创建 Bot：**

1. 在 Telegram 搜索 \`@BotFather\`
2. 发送 \`/newbot\`，按提示设置名称
3. 获得 Bot Token（格式：\`123456789:ABCdef...\`）

**配置 OpenClaw：**

\`\`\`yaml
channels:
  telegram:
    enabled: true
    bot_token: "123456789:ABCdef..."
    
    # 白名单：只允许这些用户使用
    allowed_users:
      - your_telegram_username
    
    # 权限配置
    permissions:
      your_telegram_username: owner
\`\`\`

**启动 Gateway：**

\`\`\`bash
openclaw gateway start

# 查看状态
openclaw gateway status

# 查看日志
openclaw gateway logs
\`\`\`

启动后，在 Telegram 找到你的 Bot，发送 \`/start\`，如果一切正常，AI 会回复你。

---

## 第五步：接入飞书（企业场景）

飞书适合团队使用场景。

**创建飞书应用：**

1. 访问 https://open.feishu.cn/app
2. 创建企业自建应用
3. 开启"机器人"能力
4. 获取 App ID 和 App Secret

**配置 OpenClaw：**

\`\`\`yaml
channels:
  feishu:
    enabled: true
    app_id: "cli_..."
    app_secret: "..."
    verification_token: "..."
    encrypt_key: "..."  # 可选，用于消息加密
\`\`\`

飞书还支持群聊场景，可以把 AI 加入工作群，让它参与团队协作。

---

## 第六步：配置你的 AI 人格

编辑 \`SOUL.md\` 和 \`USER.md\`，让 AI 真正了解你：

**SOUL.md 示例：**
\`\`\`markdown
你是我的个人 AI 助手，名字叫小助。

核心原则：
- 直接、简洁，不废话
- 遇到不确定的事情，先问清楚再行动
- 保护我的隐私，不主动分享个人信息
- 执行危险操作前，必须明确告知并等待确认
\`\`\`

**USER.md 示例：**
\`\`\`markdown
姓名：[你的名字]
职业：[你的职业]
技术栈：[你常用的技术]
工作时间：周一到周五，9:00-18:00
语言偏好：中文为主，技术术语可以用英文
\`\`\`

---

## 第七步：配置 Heartbeat

编辑 \`HEARTBEAT.md\`，设置你想要的主动监控任务：

\`\`\`markdown
# 心跳任务

## 每次检查（每 30 分钟）
- 检查是否有重要邮件（来自：老板、重要客户）
- 查看今天剩余的日历事件（提前 1 小时提醒）

## 工作日早上 9 点
- 汇总今日待办
- 检查昨天未完成的任务

## 每周五下午 5 点
- 生成本周工作总结草稿
\`\`\`

---

## 成本估算

| 配置方案 | 月成本 | 适用场景 |
|---------|--------|---------|
| 纯本地（Ollama） | ¥0 | 隐私优先，接受较慢速度 |
| DeepSeek API | ¥5-20 | 日常使用，中文场景 |
| Claude API | ¥50-200 | 复杂任务，高质量输出 |
| 混合方案 | ¥20-50 | 推荐：日常用本地，复杂任务用云端 |

混合方案是我最推荐的：日常对话和简单任务走本地 Ollama（零成本），遇到需要高质量输出的任务再调用云端 API。

---

## 写在最后

这个系列从 OpenClaw 的整体架构，到 Gateway 网关、Agent Stack、Skill 系统、记忆机制、Heartbeat 唤醒、安全防护，最后到今天的实战部署，走了一遍完整的旅程。

我想说的核心观点只有一个：**本地 AI 助手不是"更好的 ChatGPT"，而是一种完全不同的 AI 使用范式**。

它不是你偶尔打开用一下的工具，而是一个持续运行、了解你、帮你管理生活的数字伙伴。

这种范式的价值，需要你真正部署起来、用起来，才能体会到。

现在，去动手吧。`;
  const summary = '结合 OpenClaw 原理系列，进行实战落地：涵盖本地部署、接入 Ollama 免费本地大模型，以及对接 Telegram、飞书等主流 IM 工具的详细配置指南。';
  const slug = 'openclaw-series-8-' + Date.now().toString(36);

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
