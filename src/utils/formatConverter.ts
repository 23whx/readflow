import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pkg from 'file-saver';
const { saveAs } = pkg;
import type { FileInfo } from '../types';

// 将原文内容按“空行/编号/标题”进行更智能的分段
function segmentContentToHTML(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\r\n?/g, '\n');
  // 在常见编号或标题样式前插入空行，触发新段落
  // 例如：1. / 1、 / 1) / 一、 / （一）/ 第一章 / 第一节 等
  text = text
    .replace(/\n(?=\s*(?:[0-9]{1,3}[\.、\)]\s+))/g, '\n\n')
    .replace(/\n(?=\s*(?:第[一二三四五六七八九十百千]+[章节条篇]|[（(]?[一二三四五六七八九十]+[）)]))(?=\s*)/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n');
  const lines = text.split(/\n\n/);
  const htmlParas = lines
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => `<p class="para">${s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return htmlParas;
}

// 格式转换功能 - 将原始文档内容转换为其他格式
export class FormatConverter {
  
  // 将解析后的文本内容转换为不同格式
  static async convertToFormats(
    originalContent: string, 
    fileInfo: FileInfo, 
    formats: ('pdf' | 'docx' | 'md' | 'html')[]
  ): Promise<{ successful: string[], failed: string[] }> {
    console.log(`[格式转换] 开始批量转换，内容长度: ${originalContent.length}, 目标格式:`, formats);
    
    const successful: string[] = [];
    const failed: string[] = [];

    if (!formats || formats.length === 0) {
      console.log('[格式转换] 没有选择格式，跳过转换');
      return { successful, failed };
    }

    for (const format of formats) {
      try {
        console.log(`[格式转换] 开始转换为 ${format.toUpperCase()}`);
        
        switch (format) {
          case 'pdf':
            await this.convertToPDF(originalContent, fileInfo);
            successful.push('PDF');
            break;
          case 'docx':
            await this.convertToWord(originalContent, fileInfo);
            successful.push('Word');
            break;
          case 'md':
            this.convertToMarkdown(originalContent, fileInfo);
            successful.push('Markdown');
            break;
          case 'html':
            this.convertToHTML(originalContent, fileInfo);
            successful.push('HTML');
            break;
          default:
            throw new Error(`不支持的格式: ${format}`);
        }
        
        console.log(`[格式转换] ${format.toUpperCase()} 转换成功`);
      } catch (error) {
        console.error(`[格式转换] ${format.toUpperCase()} 转换失败:`, error);
        failed.push(`${format.toUpperCase()} (${error instanceof Error ? error.message : '转换失败'})`);
      }
    }

    return { successful, failed };
  }

  // 转换为PDF
  private static async convertToPDF(content: string, fileInfo: FileInfo): Promise<void> {
    console.log(`[PDF转换] 开始转换，原始内容长度: ${content.length}`);
    const title = fileInfo.name.replace(/\.[^/.]+$/, '');

    // 先进行智能分段
    const segmented = segmentContentToHTML(content);

    // 构建HTML，用于截图生成PDF，确保中文不乱码，并按段落边界分页
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif; margin:0; }
    .container { width: 794px; padding: 40px; box-sizing: border-box; }
    h1 { font-size: 22px; margin: 0 0 16px 0; }
    .meta { color:#555; font-size:12px; margin-bottom: 16px; }
    hr { border:none; height:1px; background:#ddd; margin:16px 0; }
    .content { line-height: 1.8; font-size: 12px; color:#222; }
    .content p { margin: 0 0 10px 0; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
  <style> body { font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; } </style>
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  </head>
<body>
  <div class="container" id="paper">
    <h1>${title}</h1>
    <div class="meta">原始文件: ${fileInfo.name} ｜ 大小: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB ｜ 时间: ${new Date().toLocaleString()}</div>
    <hr />
    <div class="content">${segmented}</div>
  </div>
  <script>
    (async function(){
      const { jsPDF } = window.jspdf;
      const el = document.getElementById('paper');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p','mm','a4');
      const pageWidth = 210; const pageHeight = 297;
      const imgWidth = pageWidth; const imgHeight = canvas.height * pageWidth / canvas.width;
      const pxPerMm = canvas.width / pageWidth;
      const pageHeightPx = pageHeight * pxPerMm;
      // 采集段落底部作为安全分页点
      const rectBase = el.getBoundingClientRect().top;
      const nodes = Array.from(el.querySelectorAll('.content p, h1, h2, h3'));
      const safeBreaks = nodes.map(n => (n.getBoundingClientRect().bottom - rectBase) * window.devicePixelRatio);
      // 逐页找到最接近页面底部的安全分页点
      const tops = [0];
      let topPx = 0;
      while (topPx + pageHeightPx < canvas.height){
        const target = topPx + pageHeightPx - 24; // 底部安全边距
        const candidates = safeBreaks.filter(v => v > topPx + 60 && v <= target);
        const breakPx = candidates.length ? candidates[candidates.length - 1] : target;
        tops.push(breakPx);
        topPx = breakPx;
      }
      // 渲染每页
      tops.forEach((startPx, idx) => {
        const offsetMm = startPx / pxPerMm;
        if (idx === 0) {
          pdf.addImage(imgData, 'JPEG', 0, -offsetMm, imgWidth, imgHeight);
        } else {
          pdf.addPage('a4','p');
          pdf.addImage(imgData,'JPEG',0,-offsetMm,imgWidth,imgHeight);
        }
      });
      pdf.save('${title}_转换.pdf');
    })();
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.src = url;
    document.body.appendChild(iframe);
    // 等iframe加载完成后会自动执行内联脚本并保存PDF
    setTimeout(() => {
      try { URL.revokeObjectURL(url); document.body.removeChild(iframe); } catch {}
    }, 8000);
  }

  // 转换为Word
  private static async convertToWord(content: string, fileInfo: FileInfo): Promise<void> {
    console.log(`[Word转换] 开始转换，原始内容长度: ${content.length}`);
    
    // 为了避免浏览器崩溃，限制内容长度
    const maxContentLength = 50000; // 限制50KB文本
    let processedContent = content;
    if (content.length > maxContentLength) {
      processedContent = content.substring(0, maxContentLength) + '\n\n[内容过长，已截断显示前50000字符]';
      console.log(`[Word转换] 内容过长，已截断至 ${processedContent.length} 字符`);
    }
    
    const title = fileInfo.name.replace(/\.[^/.]+$/, '');
    
    const children: any[] = [];

    // 添加标题
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 28,
          }),
        ],
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      })
    );

    // 添加文件信息
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '文件信息',
            bold: true,
            size: 20,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun(`原始文件: ${fileInfo.name}`),
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
          new TextRun(`转换时间: ${new Date().toLocaleString()}`),
        ],
        spacing: { after: 400 },
      })
    );

    // 添加内容标题
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '文档内容',
            bold: true,
            size: 20,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // 将内容按段落分割并添加
    const paragraphs = processedContent.split('\n\n');
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun(paragraph.trim()),
            ],
            spacing: { after: 200 },
          })
        );
      }
    });

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
    const fileName = `${title}_转换.docx`;
    saveAs(blob, fileName);
  }

  // 转换为Markdown
  private static convertToMarkdown(content: string, fileInfo: FileInfo): void {
    console.log(`[Markdown转换] 开始转换，原始内容长度: ${content.length}`);
    
    // 为了避免浏览器崩溃，限制内容长度
    const maxContentLength = 100000; // Markdown可以处理更大的文件
    let processedContent = content;
    if (content.length > maxContentLength) {
      processedContent = content.substring(0, maxContentLength) + '\n\n[内容过长，已截断显示前100000字符]';
      console.log(`[Markdown转换] 内容过长，已截断至 ${processedContent.length} 字符`);
    }
    
    const title = fileInfo.name.replace(/\.[^/.]+$/, '');
    
    let markdown = `# ${title}\n\n`;
    
    // 添加文件信息
    markdown += `## 文件信息\n\n`;
    markdown += `- **原始文件**: ${fileInfo.name}\n`;
    markdown += `- **文件大小**: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB\n`;
    markdown += `- **转换时间**: ${new Date().toLocaleString()}\n\n`;
    
    // 添加分隔线
    markdown += `---\n\n`;
    
    // 添加内容
    markdown += `## 文档内容\n\n`;
    markdown += processedContent;

    // 保存文件
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const fileName = `${title}_转换.md`;
    saveAs(blob, fileName);
  }

  // 转换为HTML
  private static convertToHTML(content: string, fileInfo: FileInfo): void {
    console.log(`[HTML转换] 开始转换，原始内容长度: ${content.length}`);
    
    // 为了避免浏览器崩溃，限制内容长度
    const maxContentLength = 100000; // HTML可以处理更大的文件
    let processedContent = content;
    if (content.length > maxContentLength) {
      processedContent = content.substring(0, maxContentLength) + '\n\n[内容过长，已截断显示前100000字符]';
      console.log(`[HTML转换] 内容过长，已截断至 ${processedContent.length} 字符`);
    }
    
    const title = fileInfo.name.replace(/\.[^/.]+$/, '');
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .file-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .file-info p {
            margin: 5px 0;
        }
        .content {
            white-space: pre-wrap;
            line-height: 1.8;
        }
        hr {
            border: none;
            height: 1px;
            background-color: #ddd;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    
    <h2>文件信息</h2>
    <div class="file-info">
        <p><strong>原始文件:</strong> ${fileInfo.name}</p>
        <p><strong>文件大小:</strong> ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
        <p><strong>转换时间:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <hr>
    
    <h2>文档内容</h2>
    <div class="content">${processedContent.replace(/\n/g, '<br>')}</div>
</body>
</html>`;

    // 保存文件
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const fileName = `${title}_转换.html`;
    saveAs(blob, fileName);
  }
}
