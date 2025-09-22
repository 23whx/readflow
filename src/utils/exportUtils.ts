import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pkg from 'file-saver';
const { saveAs } = pkg;
import type { AnalysisResult, FileInfo } from '../types';

// 动态加载 html2canvas（避免额外依赖安装）
async function loadHtml2Canvas(): Promise<any> {
  const anyWindow = window as any;
  if (anyWindow.html2canvas) return anyWindow.html2canvas;
  return await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).html2canvas);
    script.onerror = () => reject(new Error('html2canvas 加载失败'));
    document.head.appendChild(script);
  });
}

// 中文字符转换函数 - 将中文转为可显示的ASCII字符（用于PDF内容）
function convertChineseToAscii(text: string): string {
  // 扩展的中文词汇翻译映射
  const chineseMap: { [key: string]: string } = {
    // 基础词汇
    '文档': 'Document',
    '分析': 'Analysis', 
    '报告': 'Report',
    '摘要': 'Summary',
    '总结': 'Summary',
    '关键': 'Key',
    '要点': 'Points',
    '内容': 'Content',
    '大纲': 'Outline',
    '文件名': 'Filename',
    '文件大小': 'File Size',
    '文件类型': 'File Type',
    '生成时间': 'Generated Time',
    '第': 'Page',
    '页': '',
    '共': 'of',
    
    // 老子相关词汇
    '老子': 'Laozi',
    '道德经': 'Tao Te Ching',
    '帛书': 'Silk Manuscript',
    '注读': 'Commentary',
    '道': 'Tao',
    '德': 'Te/Virtue',
    '无为': 'Wu Wei',
    '自然': 'Nature',
    
    // 常见汉字和词汇
    '中国': 'China',
    '思想': 'Thought',
    '哲学': 'Philosophy',
    '智慧': 'Wisdom',
    '传统': 'Traditional',
    '文化': 'Culture',
    '经典': 'Classic',
    '古代': 'Ancient',
    '现代': 'Modern',
    '理解': 'Understanding',
    '解释': 'Explanation',
    '方法': 'Method',
    '原则': 'Principle',
    '概念': 'Concept',
    '观点': 'Viewpoint',
    '意义': 'Meaning',
    '价值': 'Value',
    '影响': 'Influence',
    '重要': 'Important',
    '主要': 'Main',
    '基本': 'Basic',
    '核心': 'Core',
    '根本': 'Fundamental',
    '深层': 'Deep',
    '表面': 'Surface',
    '整体': 'Whole',
    '部分': 'Part',
    '关系': 'Relationship',
    '结构': 'Structure',
    '系统': 'System',
    '过程': 'Process',
    '结果': 'Result',
    '原因': 'Cause',
    '条件': 'Condition',
    '环境': 'Environment',
    '情况': 'Situation',
    '问题': 'Problem',
    '答案': 'Answer',
    '解决': 'Solution',
    '目标': 'Goal',
    '方向': 'Direction',
    '发展': 'Development',
    '变化': 'Change',
    '稳定': 'Stable',
    '平衡': 'Balance',
    '和谐': 'Harmony'
  };

  let result = text;
  
  // 先替换已知的词汇
  Object.keys(chineseMap).forEach(chinese => {
    const regex = new RegExp(chinese, 'g');
    result = result.replace(regex, chineseMap[chinese]);
  });

  // 对于PDF内容，保持更多可读性
  // 将未映射的中文字符替换为问号，但保持句子结构
  result = result.replace(/[\u4e00-\u9fff]/g, '?'); // 中文字符替换为问号
  
  // 清理多余的问号
  result = result.replace(/\?{3,}/g, '???'); // 多个连续问号最多保留3个
  result = result.trim();

  return result;
}

// 专门用于文件名的安全转换函数
function convertChineseForFilename(text: string): string {
  // 扩展的文件名词汇映射
  const basicMap: { [key: string]: string } = {
    // 特定书名
    '老实人破局指南': 'Honest_Person_Breakthrough_Guide',
    '帛书老子注读': 'Silk_Manuscript_Laozi_Commentary',
    
    // 常用词汇
    '帛书': 'Silk_Manuscript',
    '老子': 'Laozi', 
    '注读': 'Commentary',
    '道德经': 'Tao_Te_Ching',
    '分析': 'Analysis',
    '报告': 'Report',
    '文档': 'Document',
    '老实人': 'Honest_Person',
    '破局': 'Breakthrough',
    '指南': 'Guide',
    '《': '',
    '》': '',
    '【': '',
    '】': '',
    '（': '',
    '）': '',
    '(': '',
    ')': '',
    '[': '',
    ']': '',
    '：': '',
    '；': '',
    '，': '',
    '。': '',
    '、': '',
    '？': '',
    '！': '',
    '"': '',
    '"': '',
    "'": '',
    "'": '',
    ' ': '_'
  };

  let result = text;
  
  // 先替换已知词汇和符号
  Object.keys(basicMap).forEach(chinese => {
    const regex = new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, basicMap[chinese]);
  });

  // 将剩余中文字符简化处理 - 避免产生太多CH
  result = result.replace(/[\u4e00-\u9fff]/g, () => 'X');

  // 清理和规范化
  result = result.replace(/[^\w\-_.]/g, ''); // 只保留字母数字下划线点横线
  result = result.replace(/_{2,}/g, '_'); // 合并多个下划线
  result = result.replace(/^_+|_+$/g, ''); // 移除首尾下划线
  result = result.replace(/X{2,}/g, 'CH'); // 将连续的X替换为单个CH
  
  // 如果结果为空或太短，使用时间戳作为后缀
  if (!result || result.length < 2) {
    const timestamp = new Date().getTime().toString().slice(-6);
    result = `Document_${timestamp}`;
  }
  
  // 限制长度
  if (result.length > 40) {
    result = result.substring(0, 37) + '_CH';
  }

  return result;
}

// 生成PDF文件 - 使用浏览器打印功能生成真正的PDF
export async function generatePDFContent(result: AnalysisResult, fileInfo?: FileInfo): Promise<void> {
  try {
    console.log('[PDF导出] 开始生成PDF文件（直接下载）');

    // 1) 准备HTML内容（与页面样式一致）
    const htmlContent = generatePDFHTML(result, fileInfo);

    // 2) 创建离屏 iframe，写入报告HTML，确保中文样式完全渲染
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.style.top = '0';
    iframe.style.width = '794px'; // A4宽度（约8.27英寸 * 96dpi ≈ 794px）
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    iframe.contentDocument?.open();
    iframe.contentDocument?.write(htmlContent);
    iframe.contentDocument?.close();

    // 3) 等待渲染及字体就绪
    await new Promise((r) => setTimeout(r, 300));

    // 4) 动态加载 html2canvas，并截图为高分辨率画布
    const html2canvas = await loadHtml2Canvas();
    const target = iframe.contentDocument?.body as HTMLElement;
    if (!target) throw new Error('PDF内容生成失败：未找到渲染目标');

    const scale = 2; // 提升清晰度
    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });

    // 5) 将长画布分页写入 jsPDF
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');

    const a4WidthMm = 210;
    const a4HeightMm = 297;
    const imgWidthMm = a4WidthMm;
    const imgHeightMm = (canvas.height * a4WidthMm) / canvas.width;

    let positionMm = 0;
    // 首页
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);

    // 继续添加后续页面（通过负偏移裁剪），并在段落边界分页
    while (positionMm + a4HeightMm < imgHeightMm) {
      positionMm += a4HeightMm;
      pdf.addPage('a4', 'p');
      pdf.addImage(imgData, 'JPEG', 0, -positionMm, imgWidthMm, imgHeightMm);
    }

    // 6) 保存PDF
    const base = fileInfo ? fileInfo.name.replace(/\.[^/.]+$/, '') : 'Document_Analysis_Report';
    const fileName = `${convertChineseForFilename(base)}_Analysis_Report.pdf`;
    pdf.save(fileName);

    // 7) 清理离屏 iframe
    document.body.removeChild(iframe);

    console.log('[PDF导出] 已直接下载PDF:', fileName);
  } catch (error) {
    console.error('[PDF导出] 生成失败:', error);
    throw new Error('PDF导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

// 生成用于PDF下载的HTML内容（简化版）
function generatePDFHTML(result: AnalysisResult, fileInfo?: FileInfo): string {
  const fileName = fileInfo ? fileInfo.name : '文档';
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档分析报告 - ${fileName}</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: 'Microsoft YaHei', '微软雅黑', 'SimSun', 'Arial', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2c5530;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #2c5530;
            font-size: 28pt;
            margin: 0;
            font-weight: bold;
        }
        
        .file-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
        }
        
        .file-info h3 {
            margin-top: 0;
            color: #047857;
        }
        
        .section {
            margin: 30px 0;
        }
        
        .section h2 {
            color: #059669;
            font-size: 18pt;
            border-bottom: 2px solid #10b981;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .summary-content {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin: 15px 0;
        }
        
        .key-points {
            background: #fefdf2;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
            margin: 15px 0;
        }
        
        .key-points li {
            margin: 10px 0;
            padding: 5px 0;
        }
        
        .outline-item {
            margin: 15px 0;
            padding: 15px;
            background: #f8fafc;
            border-radius: 5px;
            border-left: 3px solid #3b82f6;
        }
        
        .outline-item h4 {
            color: #1e40af;
            margin-top: 0;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10pt;
            color: #6b7280;
            text-align: center;
        }
        
    </style>
</head>
<body>

    <div class="header">
        <h1>📊 文档分析报告</h1>
    </div>

    ${fileInfo ? `
    <div class="file-info">
        <h3>📁 文件信息</h3>
        <p><strong>文件名：</strong>${fileInfo.name}</p>
        <p><strong>文件大小：</strong>${(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
        <p><strong>文件类型：</strong>${fileInfo.type}</p>
    </div>
    ` : ''}

    ${result.summary ? `
    <div class="section">
        <h2>📝 摘要总结</h2>
        <div class="summary-content">
            <p>${result.summary.replace(/\n/g, '</p><p>')}</p>
        </div>
    </div>
    ` : ''}

    ${result.keyPoints && result.keyPoints.length > 0 ? `
    <div class="section">
        <h2>🔑 关键要点</h2>
        <div class="key-points">
            <ul>
                ${result.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
        </div>
    </div>
    ` : ''}

    ${result.outline && result.outline.length > 0 ? `
    <div class="section">
        <h2>📋 内容大纲</h2>
        ${result.outline.map((item, index) => `
            <div class="outline-item">
                <h4>${index + 1}. ${item.title}</h4>
                ${item.content ? `<p>${item.content}</p>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>生成时间：${new Date().toLocaleString()}</p>
        <p>由 ReadFlow 智能文档分析工具生成</p>
    </div>
</body>
</html>
  `;
}

// 生成可打印的HTML内容
function generatePrintableHTML(result: AnalysisResult, fileInfo?: FileInfo): string {
  const fileName = fileInfo ? fileInfo.name : '文档';
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档分析报告 - ${fileName}</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        @media print {
            body { 
                font-size: 12pt; 
                line-height: 1.5;
                color: #000;
            }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
        }
        
        body {
            font-family: 'Microsoft YaHei', '微软雅黑', 'SimSun', 'Arial', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2c5530;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #2c5530;
            font-size: 28pt;
            margin: 0;
            font-weight: bold;
        }
        
        .file-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
        }
        
        .file-info h3 {
            margin-top: 0;
            color: #047857;
        }
        
        .section {
            margin: 30px 0;
        }
        
        .section h2 {
            color: #059669;
            font-size: 18pt;
            border-bottom: 2px solid #10b981;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .section h3 {
            color: #047857;
            font-size: 14pt;
            margin: 15px 0 10px 0;
        }
        
        .summary-content {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin: 15px 0;
        }
        
        .key-points {
            background: #fefdf2;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
            margin: 15px 0;
        }
        
        .key-points li {
            margin: 10px 0;
            padding: 5px 0;
        }
        
        .outline-item {
            margin: 15px 0;
            padding: 15px;
            background: #f8fafc;
            border-radius: 5px;
            border-left: 3px solid #3b82f6;
        }
        
        .outline-item h4 {
            color: #1e40af;
            margin-top: 0;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10pt;
            color: #6b7280;
            text-align: center;
        }
        
        .print-instruction {
            background: #dbeafe;
            border: 2px solid #3b82f6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
        }
        
        @media screen {
            .print-instruction {
                display: block;
            }
        }
        
        @media print {
            .print-instruction {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="print-instruction no-print">
        <h3>📄 PDF生成说明</h3>
        <p><strong>请按以下步骤生成PDF：</strong></p>
        <ol style="text-align: left; display: inline-block;">
            <li>按 <kbd>Ctrl+P</kbd> 或点击浏览器的打印按钮</li>
            <li>在打印对话框中选择"另存为PDF"</li>
            <li>点击"保存"即可下载PDF文件</li>
        </ol>
    </div>

    <div class="header">
        <h1>📊 文档分析报告</h1>
    </div>

    ${fileInfo ? `
    <div class="file-info">
        <h3>📁 文件信息</h3>
        <p><strong>文件名：</strong>${fileInfo.name}</p>
        <p><strong>文件大小：</strong>${(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
        <p><strong>文件类型：</strong>${fileInfo.type}</p>
    </div>
    ` : ''}

    ${result.summary ? `
    <div class="section">
        <h2>📝 摘要总结</h2>
        <div class="summary-content">
            <p>${result.summary.replace(/\n/g, '</p><p>')}</p>
        </div>
    </div>
    ` : ''}

    ${result.keyPoints && result.keyPoints.length > 0 ? `
    <div class="section">
        <h2>🔑 关键要点</h2>
        <div class="key-points">
            <ul>
                ${result.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
        </div>
    </div>
    ` : ''}

    ${result.outline && result.outline.length > 0 ? `
    <div class="section">
        <h2>📋 内容大纲</h2>
        ${result.outline.map((item, index) => `
            <div class="outline-item">
                <h4>${index + 1}. ${item.title}</h4>
                ${item.content ? `<p>${item.content}</p>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>生成时间：${new Date().toLocaleString()}</p>
        <p>由 ReadFlow 智能文档分析工具生成</p>
    </div>
</body>
</html>
  `;
}

// 生成Word文件
export async function generateWordContent(result: AnalysisResult, fileInfo?: FileInfo): Promise<void> {
  try {
    console.log('[Word导出] 开始生成Word文件');
    
    const children: any[] = [];

    // 添加标题
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '文档分析报告',
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    // 添加文件信息
    if (fileInfo) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '文件信息',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(`文件名: ${fileInfo.name}`),
          ],
          spacing: { after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(`文件大小: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`),
          ],
          spacing: { after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(`文件类型: ${fileInfo.type}`),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // 添加摘要
    if (result.summary) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '摘要总结',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(result.summary),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // 添加关键要点
    if (result.keyPoints && result.keyPoints.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '关键要点',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      result.keyPoints.forEach((point, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun(`${index + 1}. ${point}`),
            ],
            spacing: { after: 150 },
          })
        );
      });
    }

    // 添加大纲
    if (result.outline && result.outline.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '内容大纲',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      result.outline.forEach((item, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${item.title}`,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          })
        );

        if (item.content) {
          children.push(
            new Paragraph({
              children: [
                new TextRun(`   ${item.content}`),
              ],
              spacing: { after: 200 },
            })
          );
        }
      });
    }

    // 创建文档
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    // 生成并保存Word文件
    const blob = await Packer.toBlob(doc);
    const fileName = fileInfo ? `${convertChineseForFilename(fileInfo.name.replace(/\.[^/.]+$/, ''))}_Analysis_Report.docx` : 'Document_Analysis_Report.docx';
    
    saveAs(blob, fileName);
    
    console.log('[Word导出] Word文件生成成功:', fileName);
  } catch (error) {
    console.error('[Word导出] 生成失败:', error);
    throw new Error('Word导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

// 生成Markdown内容
export function generateMarkdownContent(result: AnalysisResult): string {
  let markdown = '# 文档分析报告\n\n';
  
  // 添加摘要
  if (result.summary) {
    markdown += '## 📝 摘要总结\n\n';
    markdown += result.summary + '\n\n';
  }
  
  // 添加关键要点
  if (result.keyPoints && result.keyPoints.length > 0) {
    markdown += '## 🔑 关键要点\n\n';
    result.keyPoints.forEach((point, index) => {
      markdown += `${index + 1}. ${point}\n`;
    });
    markdown += '\n';
  }
  
  // 添加大纲
  if (result.outline && result.outline.length > 0) {
    markdown += '## 📋 内容大纲\n\n';
    result.outline.forEach((item, index) => {
      markdown += `### ${index + 1}. ${item.title}\n\n`;
      if (item.content) {
        markdown += `${item.content}\n\n`;
      }
    });
  }
  
  markdown += '---\n\n*生成时间: ' + new Date().toLocaleString() + '*\n';
  
  return markdown;
}

// 生成HTML内容
export function generateHTMLContent(result: AnalysisResult): string {
  let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档分析报告</title>
    <style>
        body {
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #2c5530;
            border-bottom: 3px solid #10b981;
            padding-bottom: 10px;
        }
        h2 {
            color: #059669;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            color: #047857;
            margin-bottom: 10px;
        }
        .summary, .keypoints, .outline {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
        }
        .keypoint {
            margin: 10px 0;
            padding: 8px 0;
        }
        .outline-item {
            margin: 15px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 0.9em;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>📊 文档分析报告</h1>
`;

  // 添加摘要
  if (result.summary) {
    html += `
    <div class="summary">
        <h2>📝 摘要总结</h2>
        <p>${result.summary.replace(/\n/g, '</p><p>')}</p>
    </div>
`;
  }

  // 添加关键要点
  if (result.keyPoints && result.keyPoints.length > 0) {
    html += `
    <div class="keypoints">
        <h2>🔑 关键要点</h2>
`;
    result.keyPoints.forEach((point, index) => {
      html += `        <div class="keypoint">${index + 1}. ${point}</div>\n`;
    });
    html += `    </div>\n`;
  }

  // 添加大纲
  if (result.outline && result.outline.length > 0) {
    html += `
    <div class="outline">
        <h2>📋 内容大纲</h2>
`;
    result.outline.forEach((item, index) => {
      html += `
        <div class="outline-item">
            <h3>${index + 1}. ${item.title}</h3>
`;
      if (item.content) {
        html += `            <p>${item.content}</p>\n`;
      }
      html += `        </div>\n`;
    });
    html += `    </div>\n`;
  }

  html += `
    <div class="footer">
        <p>生成时间: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
`;

  return html;
}
