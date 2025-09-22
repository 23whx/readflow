import type { AnalysisResult, MindMapNode, OutlineNode } from '../types';

// 在JSON字符串内对未转义的双引号进行转义，仅作用于字符串字面量内部
function escapeInnerQuotesInStrings(input: string): string {
  let result = '';
  let inString = false;
  let prevChar = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (!inString) {
        // 进入字符串
        inString = true;
        result += ch;
      } else {
        // 位于字符串内部，判断是否应视为结束引号还是内部未转义引号
        if (prevChar === '\\') {
          // 已转义的引号，原样保留
          result += ch;
        } else {
          // 向后看第一个非空白字符，判断是否为字符串结束
          let j = i + 1;
          while (j < input.length && /\s/.test(input[j])) j++;
          const nextNonSpace = j < input.length ? input[j] : '';
          const isLikelyStringEnd = nextNonSpace === ',' || nextNonSpace === '}' || nextNonSpace === ']' || nextNonSpace === ':';
          if (isLikelyStringEnd) {
            // 作为结束引号
            inString = false;
            result += ch;
          } else {
            // 作为内容中的未转义双引号，转义之
            result += '\\"';
            continue; // 不更新 prevChar 为 '"'
          }
        }
      }
    } else {
      result += ch;
    }
    prevChar = ch;
  }
  return result;
}

// JSON字符串清理函数
function cleanJsonString(jsonStr: string): string {
  let cleaned = jsonStr
    // 移除可能的markdown代码块标记
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    // 移除注释
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 修复常见的JSON格式问题
    .replace(/,\s*([}\]])/g, '$1') // 移除多余的逗号
    .replace(/([}\]]),\s*$/g, '$1') // 移除末尾多余的逗号
    // 修复换行符问题（保持必要的空格）
    .replace(/\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    // 修复引号问题
    .replace(/'/g, '"')
    .trim();

  // 尝试修复常见的JSON格式问题
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    console.log('尝试修复JSON格式问题:', (e as any)?.message);
    
    // 检查是否是字符串截断问题
    const errorPos = ((e as any)?.message || '').match(/position (\d+)/);
    if (errorPos) {
      const pos = parseInt(errorPos[1]);
      console.log(`JSON在位置${pos}处出错，尝试修复截断`);
      
      // 尝试在错误位置附近查找合适的结束位置
      const beforeError = cleaned.substring(0, pos);
      const afterError = cleaned.substring(pos);
      
      // 查找最后一个完整的对象或数组
      const lastCompleteObject = beforeError.lastIndexOf('}');
      const lastCompleteArray = beforeError.lastIndexOf(']');
      const cutPoint = Math.max(lastCompleteObject, lastCompleteArray);
      
      if (cutPoint > 0) {
        // 截断到最后一个完整结构，然后添加缺失的结束符号
        let truncated = beforeError.substring(0, cutPoint + 1);
        
        // 计算需要的结束符号
        const openBraces = (truncated.match(/{/g) || []).length;
        const closeBraces = (truncated.match(/}/g) || []).length;
        const openBrackets = (truncated.match(/\[/g) || []).length;
        const closeBrackets = (truncated.match(/]/g) || []).length;
        
        // 添加缺失的结束符号
        for (let i = 0; i < openBraces - closeBraces; i++) {
          truncated += ' }';
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          truncated += ' ]';
        }
        
        // 移除可能的尾随逗号
        truncated = truncated.replace(/,(\s*[}\]])/, '$1');
        
        try {
          JSON.parse(truncated);
          console.log('JSON截断修复成功');
          return truncated;
        } catch (truncError) {
          console.log('JSON截断修复失败:', (truncError as any)?.message);
        }
      }
    }

    // 修复属性名没有引号的问题
    cleaned = cleaned.replace(/(\w+):/g, '"$1":');

    // 修复未引用的字符串值
    cleaned = cleaned.replace(/:\s*([^",{\[\]}\s]+)([,}\]])/g, ': "$1"$2');

    // 修复双重引号问题
    cleaned = cleaned.replace(/": "([^"]*)"([,}\]])/g, '": "$1"$2');

    // 移除可能的尾随逗号
    cleaned = cleaned.replace(/,(\s*[}\]])/, '$1');

    // 最后一步：转义字符串内部未转义的双引号（如: "给周围的人打"预防针"")
    cleaned = escapeInnerQuotesInStrings(cleaned);

    // 再次尝试解析，若成功则返回
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (finalErr) {
      console.log('最终解析仍失败，返回清理后的字符串供上层兜底:', (finalErr as any)?.message);
      return cleaned;
    }

  }
}

// 调用本地AI API
async function callLocalAIAPI(content: string, type: string, maxTokens: number = 2000): Promise<string> {
  const startTime = Date.now();
  console.log(`[AI API] 开始调用 ${type} 分析`, {
    contentLength: content.length,
    maxTokens,
    timestamp: new Date().toISOString()
  });

  try {
    const requestBody = {
      prompt: content,
      type,
      maxTokens
    };

    console.log(`[AI API] 发送请求到 /api/ai-analyze`, {
      bodySize: JSON.stringify(requestBody).length,
      type
    });

    const response = await fetch('/api/ai-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const elapsed = Date.now() - startTime;
    console.log(`[AI API] 收到响应`, {
      status: response.status,
      statusText: response.statusText,
      elapsed: `${elapsed}ms`,
      type
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI API] 请求失败`, {
        status: response.status,
        errorText,
        elapsed: `${elapsed}ms`,
        type
      });
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const totalElapsed = Date.now() - startTime;
    
    console.log(`[AI API] 解析响应完成`, {
      success: data.success,
      dataLength: data.data?.length || 0,
      elapsed: `${totalElapsed}ms`,
      type
    });
    
    if (!data.success) {
      console.error(`[AI API] 业务逻辑失败`, {
        error: data.error,
        type,
        elapsed: `${totalElapsed}ms`
      });
      throw new Error(data.error || 'AI分析失败');
    }

    console.log(`[AI API] ${type} 分析成功完成，耗时: ${totalElapsed}ms`);
    return data.data;
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error(`[AI API] 调用失败`, {
      error: error instanceof Error ? error.message : String(error),
      type,
      elapsed: `${totalElapsed}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('AI 分析服务暂时不可用，请稍后重试');
  }
}

// 生成摘要
export async function generateSummary(content: string): Promise<string> {
  return await callLocalAIAPI(content, 'summary', 2200);
}

// 将长文按段落分块，尽量在换行处切分
function splitContentIntoChunks(text: string, maxLen: number = 6000): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n', end);
      if (lastBreak > start + maxLen * 0.6) end = lastBreak; // 尽量在段落边界切分
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// 长文摘要：分块小结 → 归并长摘要
async function summarizeWithChunking(content: string): Promise<string> {
  const LONG_DOC_THRESHOLD = 8000;
  if (content.length <= LONG_DOC_THRESHOLD) {
    return await generateSummary(content);
  }

  const chunks = splitContentIntoChunks(content, 6000);
  const total = chunks.length;

  // 对每个分块生成小结（并标注“第i/总数”）
  const partialSummaries = await Promise.all(
    chunks.map((chunk, i) =>
      generateSummary(`【第${i + 1}/${total}部分】\n${chunk}`)
    )
  );

  // 合并小结作为“文档内容”再生成一份综合长摘要
  const combinedInput = `以下是整本文档按部分生成的小结，请综合为一份覆盖全书要点的完整长摘要：\n\n${partialSummaries.join('\n\n')}`;
  const finalSummary = await generateSummary(combinedInput);
  return finalSummary;
}

// 提取关键要点
export async function extractKeyPoints(content: string): Promise<string[]> {
  console.log('[关键要点] 开始提取关键要点');
  
  const response = await callLocalAIAPI(content, 'keyPoints', 800);
  
  console.log('[关键要点] AI响应长度:', response.length);
  console.log('[关键要点] AI响应预览:', response.substring(0, 200));
  
  // 解析响应，提取要点列表 - 支持新的emoji格式
  const points = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // 过滤掉空行和说明文字
      return line.length > 0 && 
             !line.startsWith('以下是') && 
             !line.startsWith('关键要点') &&
             !line.startsWith('#') &&
             !line.startsWith('##') &&
             !line.startsWith('---');
    })
    .map(line => {
      // 移除emoji前缀，保留核心内容
      return line.replace(/^💡\s*/, '').trim();
    })
    .filter(line => line.length > 10) // 过滤掉过短的内容
    .slice(0, 10);
  
  console.log('[关键要点] 解析完成，提取到', points.length, '个要点');
  console.log('[关键要点] 要点预览:', points.slice(0, 3));
    
  return points;
}

// 生成文档大纲
export async function generateOutline(content: string): Promise<OutlineNode[]> {
  try {
    const response = await callLocalAIAPI(content, 'outline', 1500);
    
    // 尝试解析JSON响应
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      
      // 清理可能的JSON格式问题
      jsonStr = cleanJsonString(jsonStr);
      
      try {
        const outline = JSON.parse(jsonStr);
        return Array.isArray(outline) ? outline : createFallbackOutline(content);
      } catch (parseError) {
        console.error('JSON解析失败，原始内容:', jsonStr.substring(0, 500));
        console.error('解析错误:', parseError);
        return createFallbackOutline(content);
      }
    }
    
    // 如果没有找到JSON格式，创建一个基础大纲
    return createFallbackOutline(content);
  } catch (error) {
    console.error('大纲生成失败:', error);
    return createFallbackOutline(content);
  }
}

// 生成思维导图数据
export async function generateMindMap(content: string, maxTokens: number = 1200): Promise<MindMapNode> {
  try {
    const response = await callLocalAIAPI(content, 'mindMap', maxTokens);
    
    // 尝试解析JSON响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      
      // 清理可能的JSON格式问题
      jsonStr = cleanJsonString(jsonStr);
      
      try {
        const mindMapData = JSON.parse(jsonStr);
        return mindMapData && mindMapData.id ? mindMapData : createFallbackMindMap();
      } catch (parseError) {
        console.error('JSON解析失败，原始内容:', jsonStr.substring(0, 500));
        console.error('解析错误:', parseError);
        return createFallbackMindMap();
      }
    }
    
    // 如果没有找到JSON格式，创建一个基础思维导图
    return createFallbackMindMap();
  } catch (error) {
    console.error('思维导图生成失败:', error);
    return createFallbackMindMap();
  }
}

// 生成更结构化的思维导图提示词（供后续调用端使用）
export function buildMindmapPromptForContent(raw: string): string {
  return `# 🧠 智能思维导图系统 v2.1\n\n## 结构要求\n- 根节点=文档实际核心主题\n- 主分支 3-5 个，体现核心维度；每个主分支含 2-4 个具体要点\n- 追加一个“总结”主分支（100-150字）\n- 仅用原文中的具体术语/章节/论点，禁止“概述/章节1”这类泛化词\n- 输出严格的 JSON：{id,label,children[]}\n\n## 示例（示意，勿照抄）\n{\n  "id":"root","label":"[实际主题]","children":[\n    {"id":"a","label":"[维度A]","children":[{"id":"a1","label":"[要点1]"}]},\n    {"id":"summary","label":"总结：[总括性结论]"}\n  ]\n}\n\n---\n待分析内容：\n${raw.substring(0, 2800)}...`;
}

// 规范化标签用于合并
function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().toLowerCase();
}

// 合并子节点，按标签去重
function mergeChildren(baseChildren: MindMapNode[], extraChildren: MindMapNode[]): MindMapNode[] {
  const map: Record<string, MindMapNode> = {};
  const insert = (node: MindMapNode) => {
    const key = normalizeLabel(node.label || '');
    if (!key) return;
    if (!map[key]) {
      map[key] = { id: node.id || `node_${Math.random().toString(36).slice(2, 8)}`, label: node.label, children: [] };
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      const merged = mergeChildren(map[key].children || [], node.children);
      map[key].children = merged;
    }
  };
  baseChildren?.forEach(insert);
  extraChildren?.forEach(insert);
  return Object.values(map);
}

// 将多个分块导图合并为一个导图
function mergeMindMaps(maps: MindMapNode[]): MindMapNode {
  const nonEmpty = maps.filter(m => m && (m.children?.length || 0) > 0);
  const rootLabel = nonEmpty[0]?.label || '文档思维导图';
  let children: MindMapNode[] = [];
  for (const m of nonEmpty) {
    if (Array.isArray(m.children)) {
      children = mergeChildren(children, m.children);
    }
  }
  // 可选：限制层级与宽度，提升可读性
  const clamp = (nodes: MindMapNode[], depth: number): MindMapNode[] => {
    if (!Array.isArray(nodes)) return [];
    const limited = nodes.slice(0, 6).map(n => ({
      id: n.id || `node_${Math.random().toString(36).slice(2, 8)}`,
      label: n.label,
      children: depth < 3 ? clamp(n.children || [], depth + 1) : []
    }));
    return limited;
  };
  return {
    id: 'root',
    label: rootLabel,
    children: clamp(children, 1)
  };
}

// 分块生成思维导图并合并，覆盖全文
async function generateMindMapWithChunking(content: string): Promise<MindMapNode> {
  const chunks = splitContentIntoChunks(content, 6000);
  if (chunks.length === 1) {
    return await generateMindMap(content, 2000);
  }
  const maps = await Promise.all(
    chunks.map((chunk, i) => generateMindMap(`【第${i + 1}/${chunks.length}部分】\n${chunk}`, 1500))
  );
  return mergeMindMaps(maps);
}

// 基于“结构化摘要”生成导图（更有层级与逻辑）
async function generateMindMapFromSummary(summary: string): Promise<MindMapNode> {
  // 摘要通常较短，直接一次性生成，给更高的 tokens 以容纳结构
  return await generateMindMap(summary, 2000);
}

// 完整的AI分析函数
export async function analyzeDocument(content: string): Promise<AnalysisResult> {
  const startTime = Date.now();
  console.log('[文档分析] 开始完整分析', {
    contentLength: content.length,
    timestamp: new Date().toISOString()
  });

  try {
    // 第一步：尽可能详尽的结构化长摘要
    console.log('[文档分析] 生成结构化长摘要...');
    const summary = await summarizeWithChunking(content);

    // 第二步：并行生成其余结果；思维导图基于“摘要”生成，保证逻辑结构
    console.log('[文档分析] 基于摘要生成其它结果...');
    const taskStartTime = Date.now();
    const [keyPoints, outline, mindMapData] = await Promise.all([
      extractKeyPoints(content),
      generateOutline(content),
      generateMindMapFromSummary(summary),
    ]);

    const tasksElapsed = Date.now() - taskStartTime;
    console.log('[文档分析] 所有AI任务完成', {
      elapsed: `${tasksElapsed}ms`,
      summaryLength: summary?.length || 0,
      keyPointsCount: keyPoints?.length || 0,
      outlineCount: outline?.length || 0,
      mindMapHasRoot: !!mindMapData?.id
    });

    const result: AnalysisResult = {
      summary,
      keyPoints,
      outline,
      mindMapData,
    };

    const totalElapsed = Date.now() - startTime;
    console.log('[文档分析] 完整分析成功完成', {
      totalElapsed: `${totalElapsed}ms`,
      resultSummary: {
        hasSummary: !!result.summary,
        keyPointsCount: result.keyPoints.length,
        outlineCount: result.outline.length,
        hasMindMap: !!result.mindMapData
      }
    });

    return result;
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error('[文档分析] 分析失败', {
      error: error instanceof Error ? error.message : String(error),
      elapsed: `${totalElapsed}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('文档分析失败，请重试');
  }
}

// 创建备用大纲（当AI生成失败时）
function createFallbackOutline(content: string): OutlineNode[] {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const outline: OutlineNode[] = [];
  
  // 简单的基于长度和位置的章节识别
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (line.length > 10 && line.length < 100) {
      outline.push({
        id: `section-${i + 1}`,
        title: line,
        level: 1,
        content: lines[i + 1]?.substring(0, 100) + '...' || '',
      });
    }
  }
  
  return outline.length > 0 ? outline : [
    {
      id: '1',
      title: '文档内容',
      level: 1,
      content: content.substring(0, 200) + '...',
    }
  ];
}

// 创建备用思维导图（当AI生成失败时）
function createFallbackMindMap(): MindMapNode {
  return {
    id: 'root',
    label: '文档分析',
    children: [
      {
        id: 'content',
        label: '主要内容',
        children: [
          { id: 'point1', label: '要点1' },
          { id: 'point2', label: '要点2' },
        ]
      },
      {
        id: 'structure',
        label: '文档结构',
        children: [
          { id: 'intro', label: '引言' },
          { id: 'main', label: '主体' },
          { id: 'conclusion', label: '结论' },
        ]
      }
    ]
  };
}
