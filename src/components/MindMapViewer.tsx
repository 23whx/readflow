import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Download } from 'lucide-react';
import type { MindMapNode } from '../types';

interface MindMapViewerProps {
  data: MindMapNode;
}

export default function MindMapViewer({ data }: MindMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    console.log('[MindMap] useEffect start', {
      hasContainer: !!containerRef.current,
      hasData: !!data,
      label: data?.label,
      childrenCount: Array.isArray(data?.children) ? data.children.length : 0,
    });

    // 无数据/空数据兜底，直接结束加载并提示
    if (!data || (!data.label && (!data.children || data.children.length === 0))) {
      console.warn('[MindMap] empty data, stop loading');
      setIsLoading(false);
      setError('暂无思维导图数据');
      return;
    }

    const renderMindMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 初始化 Mermaid
        console.log('[MindMap] initialize mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#10b981',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#059669',
            lineColor: '#6b7280',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#ffffff',
          },
        });

        // 将数据转换为 Mermaid 格式
        const mermaidCode = convertToMermaidFormat(data);
        console.log('[MindMap] mermaid code generated', {
          length: mermaidCode.length,
          preview: mermaidCode.slice(0, 200) + (mermaidCode.length > 200 ? '...' : ''),
        });
        
        // 清空容器
        containerRef.current.innerHTML = '';
        
        // 渲染图表（增加超时保护 + 下一帧执行，避免阻塞）
        console.log('[MindMap] render start');
        const timeout = new Promise((_r, reject) => setTimeout(() => reject(new Error('渲染超时')), 12000));
        const nextFrame = new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        await nextFrame;
        const renderPromise = mermaid.render('mindmap', mermaidCode);
        const { svg } = await Promise.race([renderPromise, timeout]) as any;
        if (svg) {
          containerRef.current.innerHTML = svg;
          console.log('[MindMap] render success', { svgLength: (svg as string).length });

          // 应用自定义配色与强调规则
          try {
            const svgEl = containerRef.current.querySelector('svg');
            if (svgEl) {
              applyCustomStyles(svgEl as unknown as SVGElement);
            }
          } catch (styleErr) {
            console.warn('[MindMap] apply style failed', styleErr);
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('[MindMap] 渲染思维导图失败:', err);
        setError('思维导图渲染失败，请重试');
        setIsLoading(false);
      }
    };

    // 等待容器就绪（Astro/React hydrate 可能导致首帧 ref 为空）
    (async () => {
      for (let i = 0; i < 30 && !containerRef.current; i++) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (!containerRef.current) {
        console.warn('[MindMap] container not ready after wait');
        setIsLoading(false);
        setError('渲染容器未就绪，请刷新重试');
        return;
      }
      await renderMindMap();
    })();
  }, [data]);

  // 全局看门狗：防止任何情况下卡在加载态
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      // 若仍在加载，强制结束并提示
      setIsLoading(false);
      console.warn('[MindMap] watchdog timeout fired');
      setError((prev) => prev || '思维导图生成超时，请稍后重试');
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 文本回退渲染：当 Mermaid 不可用或渲染失败时使用
  const renderFallbackTree = (node: MindMapNode) => {
    console.warn('[MindMap] render fallback tree');
    const renderNode = (n: MindMapNode, path: string) => (
      <li key={path}>
        <span className="text-gray-800">{n.label}</span>
        {Array.isArray(n.children) && n.children.length > 0 && (
          <ul className="ml-5 list-disc space-y-1">
            {n.children.map((c, idx) => renderNode(c, `${path}.${idx}-${c.id || c.label || 'node'}`))}
          </ul>
        )}
      </li>
    );
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-gray-900 font-semibold mb-3">思维导图（回退视图）</h4>
        <ul className="list-disc pl-5 space-y-1">
          {renderNode({ id: 'root', label: data.label || '根节点', children: data.children || [] }, 'root')}
        </ul>
      </div>
    );
  };

  // 自定义配色与强调：浅绿节点（含根节点）、黑色文本，含“核心/关键/重要/总结”的文字标红
  const applyCustomStyles = (svg: SVGElement) => {
    // 注入样式表，覆盖 mermaid 默认主题
    const style = document.createElement('style');
    style.textContent = `
      .mindmap-node rect, .mindmap-node path, .node rect, .node path, g rect, g path, .node circle, g circle {
        fill: #E8F5E9 !important; /* 淡绿 */
        stroke: #10b981 !important; /* 绿色边框 */
      }
      text { fill: #000000 !important; font-weight: 500; }
      .mindmap-link, path.link { stroke: #6ee7b7 !important; stroke-width: 1.4px; }
      /* 根节点文本颜色覆盖（部分主题会置白） */
      .nodeLabel, .label, g > text { fill: #000000 !important; }
    `;
    (svg as any).prepend(style);

    // 标红关键字文本
    const keywords = ['核心', '关键', '重要', '总结', '结论', '重点'];
    svg.querySelectorAll('text').forEach((t) => {
      const txt = (t.textContent || '').trim();
      if (keywords.some(k => txt.includes(k))) {
        (t as any).setAttribute('fill', '#d32f2f');
        (t as any).style.fill = '#d32f2f';
        (t as any).style.fontWeight = '700';
      }
    });
  };

  const convertToMermaidFormat = (node: MindMapNode): string => {
    // 有序布局：左->右主干，主分支纵向堆叠，子要点在各自分支下纵向排列
    const sanitize = (s: string) => (s || '').replace(/[\[\]{}<>|]/g, ' ').trim();
    const lines: string[] = [];
    lines.push('graph LR');
    lines.push('  %% ordered layout');
    const rootId = 'root0';
    lines.push(`  ${rootId}[${sanitize(node.label || '根节点')}]`);

    (node.children || []).forEach((branch, idx) => {
      const bId = `b${idx}`;
      const bGrp = `G${idx}`;
      lines.push(`  subgraph ${bGrp} [" "]`);
      lines.push('    direction TB');
      lines.push(`    ${bId}[${sanitize(branch.label)}]`);
      (branch.children || []).forEach((leaf, j) => {
        const lId = `${bId}_${j}`;
        lines.push(`    ${lId}[${sanitize(leaf.label)}]`);
        lines.push(`    ${bId} --> ${lId}`);
      });
      lines.push('  end');
      lines.push(`  ${rootId} --> ${bId}`);
    });

    const code = lines.join('\n');
    console.log('[MindMap] convertToMermaidFormat done', { totalLength: code.length });
    return code;
  };

  const handleExportSVG = () => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mindmap.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mindmap.png';
        link.click();
        URL.revokeObjectURL(url);
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-12 text-red-600">
          <p>{error}</p>
        </div>
        {data ? renderFallbackTree(data) : (
          <div className="flex items-center justify-center h-48 text-gray-600">暂无可渲染的数据</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleExportSVG}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>导出 SVG</span>
        </button>
        <button
          onClick={handleExportPNG}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>导出 PNG</span>
        </button>
      </div>

      <div className="relative">
        {/* 永远渲染容器，避免加载态下 ref 不存在 */}
        <div 
          ref={containerRef}
          className="w-full min-h-96 border border-gray-200 rounded-lg p-4 bg-white overflow-auto"
          style={{ maxHeight: '600px' }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">生成思维导图中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
