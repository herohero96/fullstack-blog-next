const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const title = '原理篇三：如何让大模型"长出手脚"？——Skill 系统与沙盒执行环境剖析';
  const content = `# 原理篇三：如何让大模型"长出手脚"？——Skill 系统与沙盒执行环境剖析

大模型本身只能"说话"，不能"做事"。让它真正能操作文件、执行命令、调用 API，需要一套工具系统。OpenClaw 把这套系统叫做 **Skill（技能）**。

这篇文章我们来拆解 Skill 系统的设计，以及它如何在安全边界内赋予 AI 真实的执行能力。

---

## 工具 vs 技能：OpenClaw 的命名哲学

在很多 Agent 框架里，这类能力叫"Tool"（工具）。OpenClaw 用"Skill"这个词，我觉得更准确——它不只是一个函数调用，而是一套完整的能力模块，包含：

- **功能实现**：具体的执行逻辑
- **参数定义**：告诉模型如何调用
- **权限声明**：这个技能需要什么权限
- **使用文档**：SKILL.md，供 AI 自己阅读

这种设计让每个 Skill 都是自描述的——AI 不需要硬编码知道有哪些工具，它可以读文档自己学。

---

## 核心 Skill 一览

OpenClaw 内置了一套覆盖日常操作的核心技能：

**文件系统类：**
- \`read\`：读取文件内容（支持文本和图片）
- \`write\`：创建或覆盖文件
- \`edit\`：精确替换文件中的特定文本
- \`exec\`：执行 Shell 命令

**浏览器控制类：**
- \`browser\`：控制 Chromium，支持截图、点击、表单填写、网页抓取

**通信类：**
- \`message\`：发送 Telegram/Discord 消息
- \`tts\`：文字转语音

**系统感知类：**
- \`nodes\`：控制配对设备（摄像头、屏幕录制、位置）
- \`canvas\`：操作可视化画布

这些技能组合起来，让 AI 可以完成从"帮我写一份报告并发邮件"到"监控网页变化并截图通知我"的各种任务。

---

## TypeScript 插件机制：技能是怎么定义的？

每个 Skill 本质上是一个 TypeScript 模块，遵循统一的接口规范：

\`\`\`typescript
interface Skill {
  name: string;           // 技能名称，模型用这个调用
  description: string;    // 功能描述，帮助模型理解何时使用
  parameters: JSONSchema; // 参数定义（JSON Schema 格式）
  execute: (params: any, context: AgentContext) => Promise<SkillResult>;
}
\`\`\`

模型看到的是参数定义和描述，运行时调用的是 \`execute\` 函数。这个分离设计很重要：**模型只知道"能做什么"，不知道"怎么做"**。

一个简单的文件读取技能大概长这样：

\`\`\`typescript
const readSkill: Skill = {
  name: 'read',
  description: '读取文件内容，支持文本文件和图片',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      offset: { type: 'number', description: '起始行号' },
      limit: { type: 'number', description: '最大读取行数' }
    },
    required: ['path']
  },
  execute: async ({ path, offset, limit }, ctx) => {
    // 权限检查
    ctx.checkPermission('read', path);
    // 实际读取
    const content = await fs.readFile(path, 'utf-8');
    return { success: true, content };
  }
};
\`\`\`

---

## exec 技能：最强大也最危险的工具

在所有技能中，\`exec\`（执行 Shell 命令）是最强大的，也是最需要谨慎对待的。

它让 AI 可以运行任意 Shell 命令：

\`\`\`bash
# AI 可以执行这些
ls -la ~/Documents
git commit -m "自动提交"
python3 analyze.py data.csv
curl https://api.example.com/data
\`\`\`

这种能力的边界在哪里？OpenClaw 通过几个机制来控制：

**1. 工作目录限制**
默认情况下，exec 的工作目录被限制在 workspace 内，防止 AI 随意访问系统文件。

**2. 命令白名单/黑名单**
可以配置允许或禁止的命令列表。比如禁止 \`rm -rf\`、\`sudo\`、网络请求等高风险操作。

**3. 超时控制**
每个命令都有执行超时，防止 AI 意外启动长时间运行的进程。

**4. 权限级别**
不同权限级别的用户，exec 的能力范围不同。guest 用户可能完全无法使用 exec。

---

## 沙盒执行环境：本地执行的边界

"本地执行"是 OpenClaw 的核心卖点之一，但它也带来了一个根本性的安全问题：**AI 在你的机器上运行代码，出了问题怎么办？**

OpenClaw 的沙盒策略是**分层防御**：

**第一层：进程隔离**
exec 命令在独立的子进程中运行，不继承主进程的敏感环境变量（如 API 密钥）。

**第二层：文件系统隔离**
通过配置，可以将 AI 的文件访问限制在特定目录。workspace 目录是 AI 的"家"，系统目录默认不可访问。

**第三层：网络控制**
可以配置 AI 能访问的域名白名单，防止数据外泄。

**第四层：审计日志**
所有工具调用都记录在日志中，方便事后审查。

这些层次不是非此即彼的，而是叠加使用的。你可以根据信任级别调整每一层的松紧程度。

---

## 自定义 Skill：扩展 AI 的能力边界

OpenClaw 的 Skill 系统是可扩展的。你可以编写自己的技能插件，让 AI 获得特定领域的能力。

比如，一个连接智能家居的技能：

\`\`\`typescript
const homeSkill: Skill = {
  name: 'home_control',
  description: '控制智能家居设备',
  parameters: {
    type: 'object',
    properties: {
      device: { type: 'string', enum: ['lights', 'ac', 'curtains'] },
      action: { type: 'string', enum: ['on', 'off', 'set'] },
      value: { type: 'number' }
    }
  },
  execute: async ({ device, action, value }) => {
    // 调用智能家居 API
    await homeAPI.control(device, action, value);
    return { success: true };
  }
};
\`\`\`

写好之后，AI 就能理解"帮我把客厅灯调暗一点"这样的指令，并真正执行。

---

## 我的看法：Skill 系统决定了 AI 助手的天花板

用了很多 AI 工具之后，我发现一个规律：**AI 助手的上限，不是模型有多聪明，而是它能调用哪些工具**。

GPT-4o 再聪明，如果只能聊天，它帮不了你发邮件、整理文件、监控数据。而一个普通模型，配上完善的 Skill 系统，可以完成让人惊叹的复杂任务。

OpenClaw 的 Skill 系统设计得相当克制——它没有试图把所有功能都内置，而是提供了一个清晰的扩展接口，让用户根据自己的需求定制。这种"平台思维"，才是真正可持续的 AI 助手架构。`;
  const summary = '深度解析 OpenClaw Skill 系统与沙盒执行环境，从 TypeScript 插件机制入手，解析如何执行 Shell 命令、读写文件、操作 API，以及本地执行的安全边界。';
  const slug = 'openclaw-series-4-' + Date.now().toString(36);

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
