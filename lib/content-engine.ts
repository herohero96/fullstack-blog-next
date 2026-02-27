import { callClaude } from './claude'

export interface ExpandedContent {
  blog: string;
  xiaohongshu: string;
  twitter: string;
}

/**
 * AI 爆款文案扩写引擎
 * 将简短的新闻摘要转化为适合不同平台发布的内容
 */
export async function expandAIContent(rawContent: string): Promise<ExpandedContent | null> {
  const prompt = `你现在是资深 AI 应用架构师博主“勇哥”。
请将以下原始 AI 资讯进行深度扩写，并针对不同平台进行风格适配。

原始资讯：
${rawContent}

输出要求（请务必一次性输出三个版本）：

---BLOG_VERSION---
[博客/知乎解析版]
要求：专业硬核。结构：技术背景 -> 核心突破 -> 行业影响分析 -> 勇哥点评。500字以上。

---XHS_VERSION---
[小红书/即刻爆款版]
要求：高情绪价值，多 Emoji。标题党。每段话短，带 #AI #程序员 标签。

---TWITTER_VERSION---
[Twitter/X 连载版]
要求：极简 Thread 格式。拆分成 3-5 条，第一条要震撼。

---END---
请严格按照上述分隔符输出，不要说废话。`;

  const messages = [{ role: 'user' as const, content: prompt }];
  
  try {
    const res = await callClaude(messages, undefined, false, 2048);
    if (!res.ok) throw new Error(`Claude API failed: ${res.status}`);
    
    const data = await res.json();
    const fullText = data.content[0]?.text || '';

    return {
      blog: fullText.match(/---BLOG_VERSION---([\s\S]*?)---XHS_VERSION---/)?.[1]?.trim() || '',
      xiaohongshu: fullText.match(/---XHS_VERSION---([\s\S]*?)---TWITTER_VERSION---/)?.[1]?.trim() || '',
      twitter: fullText.match(/---TWITTER_VERSION---([\s\S]*?)---END---/)?.[1]?.trim() || '',
    };
  } catch (error) {
    console.error('Expansion failed:', error);
    return null;
  }
}
