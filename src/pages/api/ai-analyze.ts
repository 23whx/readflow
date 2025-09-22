import type { APIRoute } from 'astro';

// 通义千问 API 配置 - 使用新的兼容OpenAI的API格式
const QWEN_API_KEY = 'sk-74e7549835cc4bd49f6a8160d900cda3';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

interface QwenResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface RequestBody {
  prompt: string;
  maxTokens?: number;
  type: 'summary' | 'keyPoints' | 'outline' | 'mindMap';
}

// 调用通义千问 API - 使用新的API格式
async function callQwenAPI(prompt: string, maxTokens: number = 2000): Promise<string> {
  const requestBody = {
    model: 'qwen-turbo',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    top_p: 0.8,
    stream: false
  };

  console.log('发送AI API请求:', {
    url: QWEN_API_URL,
    model: requestBody.model,
    contentLength: prompt.length,
    maxTokens
  });

  try {
    console.log('正在发送请求到:', QWEN_API_URL);
    console.log('请求体大小:', JSON.stringify(requestBody).length, 'bytes');
    
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('AI API响应状态:', response.status, response.statusText);

    // 先获取响应文本，然后尝试解析
    const responseText = await response.text();
    console.log('AI API原始响应:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('API错误响应:', responseText);
      throw new Error(`API 请求失败: ${response.status} - ${responseText}`);
    }

    // 尝试解析JSON
    let data: QwenResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      console.error('响应内容:', responseText);
      throw new Error('API返回的不是有效的JSON格式');
    }
    
    if (!data.choices || data.choices.length === 0) {
      console.error('API响应格式错误:', data);
      throw new Error('API返回的响应格式不正确');
    }

    const result = data.choices[0].message.content;
    console.log('AI API调用成功，返回内容长度:', result.length);
    
    return result;
  } catch (error) {
    console.error('AI API 调用失败:', error);
    console.error('错误类型:', typeof error);
    console.error('错误详情:', error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : error);
    
    // 检查是否是网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('网络连接失败，请检查网络或API服务状态');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('AI 分析服务暂时不可用，请稍后重试');
  }
}

// 基础与激进两级内容清理，减少审核拦截
function sanitizeTextBasic(text: string): string {
  if (!text) return text;
  const patterns = [
    /性交|做爱|上床|强奸|性行为|开房|约炮/g,
    /阴道|阴茎|阴部|阳具|精液|高潮|自慰/g,
    /裸照|裸露|乳房|胸部|骚/g
  ];
  let t = text;
  patterns.forEach((re) => {
    t = t.replace(re, '【不适宜】');
  });
  return t;
}

function sanitizeTextAggressive(text: string): string {
  if (!text) return text;
  // 逐行删除包含敏感词的句子，并限制长度
  const lines = text.split(/\n+/).filter((ln) => {
    const s = ln.trim();
    if (!s) return false;
    return !/(性交|做爱|上床|强奸|性行为|开房|约炮|阴道|阴茎|阴部|阳具|精液|高潮|自慰|裸照|裸露|乳房|胸部|骚)/.test(s);
  });
  return lines.join('\n').slice(0, 3500);
}

// 生成不同类型的提示词（双语输出）
function generatePrompt(content: string, type: string): string {
  const safe = sanitizeTextBasic(content);
  const prompts = {
    summary: `# 📚 智能文档摘要系统 v2.1（双语 Bilingual）

## 角色定位
你是一位专业的文档分析专家，擅长深度解读、内容提炼和知识转化。输出需系统、深入、可应用，且中英双语逐段对应。

## 输出要求
请按以下结构输出**详细摘要（800-1200字）**，并提供中英双语逐段对应：

**📖 核心主题 / Core Theme**（150-200字）
[中文] 详细阐述文档的核心主题，包括背景、目标、意义和适用范围
[English] Elaborate the core theme, including background, goals, significance and scope

**🎯 主要观点 / Key Arguments**（400-500字）
- [中文] 观点1：详细说明与证据
  [English] Point 1: detailed explanation and evidence
- [中文] 观点2：…
  [English] Point 2: …
- [中文] 观点3：…
  [English] Point 3: …
- [中文] 观点4：…
  [English] Point 4: …
- [中文] 观点5：…
  [English] Point 5: …

**💎 关键洞察 / Key Insights**（200-250字）
[中文] 深入分析文档中最有价值的深层洞察
[English] In-depth analysis of the most valuable insights

**⚡ 实用价值 / Practical Value**（150-200字）
[中文] 不同读者如何应用
[English] How different readers can apply

**🔗 核心结论 / Core Conclusions**（150-200字）
[中文] 总结与行动指南
[English] Summary and action guidelines

---
待分析文档内容：
${safe.substring(0, 3000)}...

请严格按照上述格式输出，保证中英双语逐段对应。`,

    keyPoints: `# 🎯 关键要点提取系统（双语 Bilingual）

## 目标
从文档中提取5-10个最重要的要点。每条要点必须包含中文与英文两行，英文是对中文的准确翻译。

## 输出格式
💡 [中文要点] - [为什么重要/如何应用]
   [English] [English point] - [Why it matters / How to apply]

---
待分析文档内容：
${safe.substring(0, 3000)}...

请按上述格式输出，中英配对逐条给出。`,

    outline: `# 📋 智能大纲生成系统 v2.1（双语 Bilingual）

## 要求
返回 JSON 数组，且每个节点包含中英双语字段：title/title_en 与 content/content_en。

JSON 示例：
[
  {
    "id": "1",
    "title": "[中文标题]",
    "title_en": "[English Title]",
    "level": 1,
    "content": "[中文概述]",
    "content_en": "[English Summary]"
  }
]

---
待分析文档内容：
${safe.substring(0, 4000)}...`,

    mindMap: `# 🧠 智能思维导图系统 v2.1（双语 Bilingual）

## 要求
返回 JSON 对象，并保证每个节点包含 label 与 label_en 字段；结构为 根节点→3-5个主分支→每支2-4个子点，均为来自原文的具体概念。

JSON 示例：
{
  "id": "root",
  "label": "[中文主题]",
  "label_en": "[English Topic]",
  "children": [
    {
      "id": "b1",
      "label": "[中文分支]",
      "label_en": "[English Branch]",
      "children": [
        { "id": "b1_1", "label": "[中文要点1]", "label_en": "[English Point 1]" },
        { "id": "b1_2", "label": "[中文要点2]", "label_en": "[English Point 2]" }
      ]
    }
  ]
}

---
待分析文档内容：
${safe.substring(0, 3000)}...`
  };

  return prompts[type as keyof typeof prompts] || prompts.summary;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 添加请求体解析的错误处理
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('请求体解析失败:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: '请求格式错误，无法解析JSON' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { prompt, maxTokens = 2000, type } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '缺少prompt参数' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`处理${type}类型的AI请求，内容长度: ${prompt.length}`);

    // 生成特定类型的提示词
    const fullPrompt = type ? generatePrompt(prompt, type) : prompt;
    
    // 调用AI API（出现 data_inspection_failed 时重试一次，使用更激进清理）
    let result: string;
    try {
      result = await callQwenAPI(fullPrompt, maxTokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('data_inspection_failed')) {
        console.warn('检测到敏感内容，进行二次清理并重试');
        const saferPrompt = type ? generatePrompt(sanitizeTextAggressive(prompt), type) : sanitizeTextAggressive(prompt);
        result = await callQwenAPI(saferPrompt, maxTokens);
      } else {
        throw err;
      }
    }

    console.log(`AI API调用成功，返回内容长度: ${result.length}`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: result,
      type 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('API处理失败:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

