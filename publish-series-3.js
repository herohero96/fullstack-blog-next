const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const title = '原理篇二：AI 的"大脑调度"——多智能体路由与底层 Agent Stack';
  const content = `# 原理篇二：AI 的"大脑调度"——多智能体路由与底层 Agent Stack

上一篇我们聊了 Gateway 如何把各种 IM 渠道统一接入。消息进来之后，下一个问题是：**谁来处理它？用哪个 AI 模型？怎么执行？**

这就是 Agent Stack 要解决的问题。

---

## 先搞清楚一件事：模型 ≠ Agent

很多人把"AI 模型"和"AI Agent"混为一谈，但这是两个层次的概念。

**模型**（Model）是纯粹的推理引擎：给它输入，它输出文本。Claude、GPT-4o、DeepSeek——它们本质上都是"文字预测机器"，没有记忆，没有工具，不能执行任何操作。

**Agent**（智能体）是在模型之上构建的运行时：它维护上下文、调用工具、管理任务循环，让模型从"会说话"变成"能干活"。

OpenClaw 的 Agent Stack，就是这个运行时的具体实现。

---

## Agent 运行循环：ReAct 模式

OpenClaw 的 Agent 核心采用 **ReAct（Reasoning + Acting）** 模式，这是目前主流 Agent 框架的标准范式。

一个完整的循环是这样的：

\`\`\`
用户输入
    ↓
[Reasoning] 模型思考：我需要做什么？需要哪些信息？
    ↓
[Acting] 调用工具：执行 Shell 命令 / 读写文件 / 调用 API
    ↓
[Observation] 获取工具返回结果
    ↓
[Reasoning] 模型再次思考：结果符合预期吗？还需要什么？
    ↓
（循环，直到任务完成）
    ↓
生成最终回复
\`\`\`

这个循环的关键在于：**模型不是一次性给出答案，而是通过多轮"思考-行动-观察"逐步完成复杂任务**。

比如你说"帮我整理一下桌面上的文件"，Agent 会先列出文件（工具调用），观察结果，再决定如何分类，然后执行移动操作，最后确认完成。整个过程可能经历 5-10 轮循环。

---

## 多模型调度：为什么需要切换？

OpenClaw 支持同时配置多个 AI 模型，并根据场景动态路由。这不是噱头，而是实际需求驱动的设计。

**不同模型有不同的优势：**

| 模型 | 擅长 | 适用场景 |
|------|------|----------|
| Claude Sonnet | 长文本理解、代码、推理 | 复杂任务、文档分析 |
| GPT-4o | 多模态、工具调用 | 图片理解、结构化输出 |
| DeepSeek | 中文、数学、低成本 | 日常对话、中文写作 |
| 本地模型（Ollama）| 隐私、零成本 | 敏感数据处理 |

**路由策略可以基于：**

- **任务类型**：代码任务用 Claude，中文写作用 DeepSeek
- **成本控制**：简单问题用便宜模型，复杂任务升级到高端模型
- **隐私级别**：涉及私人数据时，强制路由到本地模型
- **用户偏好**：允许用户手动指定（\`/model claude\`）

这种设计让 OpenClaw 不绑定任何单一模型提供商，也不会因为某个 API 挂掉而完全失效。

---

## 工具调用的底层机制

Agent 的"手脚"来自工具调用（Tool Calling / Function Calling）。

现代大模型（Claude、GPT-4o 等）都支持一种特殊的输出格式：不直接输出文字，而是输出一个结构化的"工具调用请求"：

\`\`\`json
{
  "tool": "exec",
  "parameters": {
    "command": "ls -la ~/Desktop",
    "timeout": 10
  }
}
\`\`\`

Agent 运行时接收到这个请求，执行对应的工具，把结果塞回上下文，让模型继续推理。

这个机制的精妙之处在于：**模型本身不执行任何操作，它只是"声明意图"**。真正的执行权在 Agent 运行时手里。这意味着你可以在运行时层面做权限控制、审计日志、沙箱隔离——模型无法绕过这些限制。

---

## 子 Agent：任务分解与并行执行

对于复杂的长任务，单个 Agent 循环可能不够用。OpenClaw 支持**子 Agent（Subagent）**机制。

主 Agent 可以将任务分解，派生出多个子 Agent 并行执行：

\`\`\`
主 Agent：帮我分析这 10 份报告，总结关键趋势
    ↓
子 Agent 1：分析报告 1-3
子 Agent 2：分析报告 4-6  （并行）
子 Agent 3：分析报告 7-10
    ↓
主 Agent：汇总三个子 Agent 的结果，生成最终报告
\`\`\`

子 Agent 完成后，结果自动推送回主 Agent（push-based，不需要轮询）。这种设计大幅提升了处理大规模任务的效率。

---

## 上下文窗口管理：Agent 的"工作记忆"

每个模型都有上下文窗口限制（比如 Claude 是 200K tokens）。对于长时间运行的 Agent，如何管理这个窗口是个关键问题。

OpenClaw 的策略是**分层上下文**：

1. **系统提示词**（固定，每次都注入）：角色定义、工具列表、用户偏好
2. **近期对话**（滑动窗口）：保留最近 N 轮对话
3. **工具执行日志**（压缩）：长输出会被截断或摘要化
4. **外部记忆**（按需检索）：历史对话存储在文件，需要时才加载

这种分层设计让 Agent 在有限的上下文窗口内，既能保持当前任务的连贯性，又能访问历史信息。

---

## 我的观察：Agent Stack 是 AI 产品的真正护城河

用过很多 AI 工具之后，我越来越觉得：**模型本身的差距在缩小，但 Agent Stack 的差距在拉大**。

GPT-4o 和 Claude 的能力差距，普通用户感知不明显。但一个设计良好的 Agent 运行时，能让同样的模型完成普通聊天界面完全做不到的事情。

OpenClaw 的多模型路由、子 Agent 并行、工具调用沙箱——这些不是"高级功能"，而是让 AI 从"聊天玩具"变成"生产力工具"的基础设施。

理解了 Agent Stack，你才真正理解了为什么本地 AI 助手和网页版 ChatGPT 是完全不同的东西。`;
  const summary = '剖析 OpenClaw 多模型调度机制，解析 ReAct Agent 运行循环、工具调用底层原理，以及子 Agent 并行任务分解机制。';
  const slug = 'openclaw-series-3-' + Date.now().toString(36);

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
