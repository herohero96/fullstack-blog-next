import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const newContent = `# 使用 OpenClaw 的三个高效经验

用了一段时间 OpenClaw，总结了三个让效率大幅提升的使用方式。

## 经验一：给 OpenClaw 一个任务列表

以前和 OpenClaw 对话，都是想到什么说什么，做完一件事再说下一件。后来发现可以直接给它一个任务列表，让它按优先级依次完成，效率高很多。

做法很简单，在 workspace 里维护一个 \`MY_TASKS.md\` 文件：

\`\`\`markdown
## 待办任务

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| 1 | 给博客加游客评论功能 | 高 | ⏳ 待执行 |
| 2 | AI 助手抽屉样式优化 | 中 | ⏳ 待执行 |
| 3 | 首页左侧加文章列表 | 低 | ⏳ 待执行 |
\`\`\`

告诉 OpenClaw"开始执行"，它就会按优先级逐个处理，完成后更新状态，全部做完通过 Telegram 通知我。

这样的好处是：我可以随时往列表里加任务，不用等上一个做完再说下一个。OpenClaw 有了全局视角，能更合理地安排执行顺序。

## 经验二：启动子 Agent 用 Claude Code 团队模式写代码

这是我觉得最强的用法，最终我把它封装成了一个 **codeteam skill**。

以前让 OpenClaw 写代码，它会直接动手，期间我没法和它正常对话——它在写代码，我在等，体验很差。

后来发现可以让它启动一个子 Agent，在后台用 Claude Code 的团队模式完成代码任务，主对话完全不阻塞。

具体流程是：

1. 和 OpenClaw 讨论好方案，确认需求
2. 让它通过 \`sessions_spawn\` 开一个子 Agent
3. 子 Agent 通过 tmux 向 Claude Code 发送 \`/add-task\` 命令，把需求拆成多个子任务
4. 发送 \`/run-tasks\`，Claude Code 团队模式按顺序执行所有任务
5. 子 Agent 监控进度，测试通过后推送代码
6. 完成后通过 Telegram 通知我

整个架构是这样的：

\`\`\`
主对话（和我聊天）
  └── sessions_spawn 子 Agent（管理者）
        └── tmux → Claude Code（执行者）
              ├── /add-task 任务1
              ├── /add-task 任务2
              ├── /add-task 测试任务
              └── /run-tasks 执行所有任务
\`\`\`

整个过程我和 OpenClaw 继续正常聊天，代码在后台默默跑完，完全感觉不到等待。

就像叫了外卖，不用盯着门口等，外卖到了门铃会响。

把这套流程封装成 codeteam skill 后，以后有代码任务直接说"用 codeteam 完成"，OpenClaw 就会自动走这套流程，不需要每次重复说明。

## 经验三：用手机 Termius 远程连接服务器

OpenClaw 跑在云服务器上，有时候需要直接看终端状态。手机上装 Termius，配好 SSH 密钥，随时随地都能登上服务器。

连上后想看 Claude Code 正在干什么，直接：

\`\`\`bash
tmux attach -t claude-ui
\`\`\`

就能进入 Claude Code 的界面，看到它实时执行任务的过程。退出用 \`Ctrl+B D\`，不会关掉 session，Claude Code 继续在后台跑。

躺在床上用手机看服务器跑代码，这种感觉还挺奇妙的 😄

## 小结

这三个经验的核心思路是一样的：**把 OpenClaw 从被动响应变成主动执行**。给它任务列表，它知道该做什么；给它子 Agent + codeteam skill，它知道怎么高效做；手机远程连接，随时随地都能掌控服务器状态。

用好这三个方式，OpenClaw 更像一个真正的助手，而不只是一个聊天机器人。

**访问地址：** https://ai-news-hub-next.vercel.app/`

async function main() {
  await prisma.article.update({
    where: { id: 13 },
    data: { content: newContent }
  })
  console.log('✅ 文章更新完成')
  await prisma.$disconnect()
}
main().catch(console.error)
