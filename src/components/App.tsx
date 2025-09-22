import React, { useState } from 'react';
import Header from './Header';
import FileUpload from './FileUpload';
import FunctionSelector from './FunctionSelector';
import ProcessingStatus from './ProcessingStatus';
import ResultDisplay from './ResultDisplay';
import { parseFile } from '../utils/fileParser';
import { analyzeDocument } from '../utils/aiService';
import { generatePDFContent, generateWordContent, generateMarkdownContent, generateHTMLContent } from '../utils/exportUtils';
import { FormatConverter } from '../utils/formatConverter';
import type { FileInfo, ProcessingStatus as Status, AnalysisResult, ExportOptions, UILanguage } from '../types';

type AppState = 'idle' | 'file-selected' | 'processing' | 'completed' | 'error';

type ExtendedFileSelection = {
  info: FileInfo;
  object: File;
  parsedContent?: string;
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [status, setStatus] = useState<Status>('idle');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ExtendedFileSelection | null>(null);
  const [preSelectedExportFormats, setPreSelectedExportFormats] = useState<('pdf' | 'docx' | 'md' | 'html')[] | null>(null);
  const [lang, setLang] = useState<UILanguage>('en');

  const handleFileSelect = (fileInfo: FileInfo, fileObject: File) => {
    console.log('=== 文件选择开始 ===');
    console.log('文件信息:', {
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      actualFileSize: fileObject.size,
      lastModified: new Date(fileObject.lastModified).toISOString()
    });
    
    setSelectedFile({ info: fileInfo, object: fileObject });
    setAppState('file-selected');
    setError(null);
    
    console.log('文件选择完成，状态更新为: file-selected');
  };

  const handleFunctionSelection = async (selectedFunctions: string[], exportFormats?: ('pdf' | 'docx' | 'md' | 'html')[]) => {
    console.log('=== 功能选择处理开始 ===');
    console.log('选择的功能:', selectedFunctions);
    console.log('导出格式:', exportFormats);
    
    // 存储预选的导出格式
    if (exportFormats) {
      setPreSelectedExportFormats(exportFormats);
      console.log('已存储预选导出格式:', exportFormats);
    }
    
    if (!selectedFile) {
      console.error('错误: 没有选择的文件');
      return;
    }

    console.log('开始处理文件:', selectedFile.info.name);
    setAppState('processing');
    setStatus('uploading');
    setCurrentStep('准备处理文件...');
    setProgress(10);

    try {
      console.log('=== 文件解析阶段 ===');
      setStatus('parsing');
      setCurrentStep(`解析 ${selectedFile.info.name}...`);
      setProgress(30);
      
      const startParseTime = Date.now();
      console.log('开始解析时间:', new Date(startParseTime).toISOString());
      
      // 实际解析文件内容
      let content: string;
      try {
        // 绑定全局进度回调桥接（PDF解析内部会调用）
        (window as any).__readflow_onParseProgress = (p: any) => {
          if (p?.message) setCurrentStep(p.message);
          if (typeof p?.percent === 'number') setProgress(Math.max(1, Math.min(99, p.percent)));
        };

        content = await parseFile(selectedFile.object, selectedFile.info);
        const parseTime = Date.now() - startParseTime;
        console.log(`文件解析成功，耗时: ${parseTime}ms，内容长度: ${content.length}`);
        
        // 缓存解析内容
        selectedFile.parsedContent = content;
      } catch (parseError) {
        const parseTime = Date.now() - startParseTime;
        console.error(`文件解析失败，耗时: ${parseTime}ms，错误:`, parseError);
        
        // 统一使用通用模拟内容
        setCurrentStep('文件解析遇到问题，使用示例内容进行演示...');
        content = `这是一个示例文档内容。文档包含了多个章节和重要信息。

第一章：介绍
本章节介绍了文档的基本概念和目标。主要内容包括背景信息、研究目的和方法论。

第二章：理论基础
详细阐述了相关的理论框架和概念模型。包括核心理论、支撑理论和应用场景。

第三章：实践应用
通过具体案例展示理论在实际场景中的应用。分析了成功案例和失败教训。

第四章：结论与展望
总结了研究成果，提出了未来发展方向和建议。包括理论贡献和实践价值。

关键要点：
- 理论与实践相结合
- 系统性思维方法
- 创新解决方案
- 可持续发展理念`;
        
        console.log('使用备用内容，长度:', content.length);
      } finally {
        // 清理进度回调
        try { delete (window as any).__readflow_onParseProgress; } catch {}
      }
      
      // 处理格式转换（如果选择了转换功能）
      if (selectedFunctions.some(f => ['convert_basic', 'convert_ai'].includes(f))) {
        console.log('=== 格式转换阶段 ===');
        setStatus('converting');
        setCurrentStep('转换文档格式中...');
        setProgress(50);
        
        const convertStartTime = Date.now();
        try {
             console.log('调用格式转换，参数:', {
               contentLength: content.length,
               fileInfo: selectedFile.info,
               formats: preSelectedExportFormats
             });
             
             const { successful, failed } = await FormatConverter.convertToFormats(
               content,
               selectedFile.info,
               preSelectedExportFormats || []
             );
          
          const convertTime = Date.now() - convertStartTime;
          console.log(`格式转换完成，耗时: ${convertTime}ms`);
          console.log('转换结果:', { successful, failed });
          
          if (successful.length > 0) {
            alert(`✅ 格式转换成功：${successful.join(', ')}\n${failed.length > 0 ? `❌ 转换失败：${failed.join(', ')}` : ''}`);
          } else if (failed.length > 0) {
            alert(`❌ 所有格式转换都失败了：${failed.join(', ')}`);
          }
             } catch (error) {
               console.error('格式转换失败:', error);
               console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');
               const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : '未知错误');
               alert('格式转换失败: ' + errorMessage);
             }
      }
      
      // 根据选择的功能执行相应处理
      if (selectedFunctions.some(f => ['summary', 'outline', 'mindmap'].includes(f))) {
        console.log('=== AI分析阶段 ===');
        console.log('需要AI分析的功能:', selectedFunctions.filter(f => ['summary', 'outline', 'mindmap'].includes(f)));
        
        setStatus('analyzing');
        setCurrentStep('AI 智能分析中...');
        setProgress(60);
        
        const startAnalysisTime = Date.now();
        console.log('开始AI分析时间:', new Date(startAnalysisTime).toISOString());
        console.log('准备发送给AI的内容长度:', content.length);
        console.log('内容预览:', content.substring(0, 200) + '...');
        
        try {
          // 调用AI分析
          const analysisResult = await analyzeDocument(content);
          const analysisTime = Date.now() - startAnalysisTime;
          
          console.log(`AI分析完成，耗时: ${analysisTime}ms`);
          console.log('分析结果概览:', {
            summaryLength: analysisResult.summary?.length || 0,
            keyPointsCount: analysisResult.keyPoints?.length || 0,
            outlineCount: analysisResult.outline?.length || 0,
            mindMapNodes: analysisResult.mindMapData?.children?.length || 0
          });
          
          setStatus('generating');
          setCurrentStep('生成思维导图...');
          setProgress(90);
          
          // 模拟生成延迟
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setResult(analysisResult);
          console.log('分析结果已设置到状态');
        } catch (analysisError) {
          const analysisTime = Date.now() - startAnalysisTime;
          console.error(`AI分析失败，耗时: ${analysisTime}ms，错误:`, analysisError);
          throw analysisError; // 重新抛出错误以便外层catch处理
        }
      } else {
        console.log('没有选择需要AI分析的功能，跳过AI分析阶段');
      }
      
      console.log('=== 处理完成阶段 ===');
      setStatus('completed');
      setCurrentStep('处理完成！');
      setProgress(100);
      setAppState('completed');
      
      console.log('所有处理完成，最终状态: completed');
      
    } catch (err) {
      console.error('=== 处理失败 ===');
      console.error('错误详情:', err);
      console.error('错误堆栈:', err instanceof Error ? err.stack : '无堆栈信息');
      
      const errorMessage = err instanceof Error ? err.message : '处理失败，请重试';
      console.error('设置的错误消息:', errorMessage);
      
      setError(errorMessage);
      setStatus('error');
      setAppState('error');
      setProgress(0);
      
      console.log('错误状态已设置');
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setAppState('idle');
    setStatus('idle');
    setProgress(0);
    setCurrentStep('');
  };

  const handleExport = async (options: ExportOptions) => {
    if (!result) return;

    try {
      console.log('[导出] 开始导出，选择格式:', options.formats);
      
      const successfulExports: string[] = [];
      const failedExports: string[] = [];
      
      for (const format of options.formats) {
        try {
          console.log(`[导出] 处理格式: ${format}`);
          
          // 模拟导出过程
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let content = '';
          let mimeType = '';
          let filename = '';
          
          switch (format) {
            case 'pdf':
              console.log('[导出] 生成PDF文件');
              await generatePDFContent(result, selectedFile?.info);
              successfulExports.push('PDF');
              continue;
            case 'docx':
              console.log('[导出] 生成Word文件');
              await generateWordContent(result, selectedFile?.info);
              successfulExports.push('Word');
              continue;
            case 'md':
              console.log('[导出] 生成Markdown内容');
              content = generateMarkdownContent(result);
              mimeType = 'text/markdown';
              filename = selectedFile?.info ? `${selectedFile.info.name.replace(/\.[^/.]+$/, '').replace(/[\u4e00-\u9fff]/g, '').replace(/[^\w\-_.]/g, '') || 'Document'}_Analysis_Report.md` : 'Document_Analysis_Report.md';
              break;
            case 'html':
              console.log('[导出] 生成HTML内容');
              content = generateHTMLContent(result);
              mimeType = 'text/html';
              filename = selectedFile?.info ? `${selectedFile.info.name.replace(/\.[^/.]+$/, '').replace(/[\u4e00-\u9fff]/g, '').replace(/[^\w\-_.]/g, '') || 'Document'}_Analysis_Report.html` : 'Document_Analysis_Report.html';
              break;
            default:
              throw new Error('不支持的导出格式: ' + format);
          }
          
          console.log(`[导出] 创建${format}文件下载，文件名:`, filename);
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
          
          successfulExports.push(format.toUpperCase());
          console.log(`[导出] ${format}文件下载完成`);
          
        } catch (err) {
          console.error(`[导出] ${format}格式导出失败:`, err);
          failedExports.push(format.toUpperCase());
        }
      }
      
      // 显示导出结果
      let message = '';
      if (successfulExports.length > 0) {
        message += `成功导出: ${successfulExports.join(', ')}`;
      }
      if (failedExports.length > 0) {
        if (message) message += '\n';
        message += `跳过或失败: ${failedExports.join(', ')}`;
      }
      
      if (message) {
        alert(message);
      }
      
      console.log('[导出] 批量导出完成，成功:', successfulExports, '失败:', failedExports);
      
    } catch (err) {
      console.error('[导出] 批量导出失败:', err);
      alert('导出失败，请重试');
    }
  };

  const handleFormatConvert = async (formats: ('pdf' | 'docx' | 'md' | 'html')[]) => {
    if (!selectedFile) return;

    try {
      console.log('[格式转换] 开始转换，选择格式:', formats);
      
      // 解析文件内容（如果还没有解析过）
      let content = '';
      if (selectedFile.parsedContent) {
        content = selectedFile.parsedContent;
        console.log('[格式转换] 使用已解析的内容，长度:', content.length);
      } else {
        console.log('[格式转换] 重新解析文件内容');
        const parseStartTime = Date.now();
        content = await parseFile(selectedFile.object);
        console.log(`[格式转换] 文件解析完成，耗时: ${Date.now() - parseStartTime}ms，内容长度: ${content.length}`);
        
        // 缓存解析内容
        selectedFile.parsedContent = content;
      }
      
      // 调用格式转换器
      const { successful, failed } = await FormatConverter.convertToFormats(
        content,
        selectedFile.info,
        formats
      );
      
      // 显示转换结果
      let message = '';
      if (successful.length > 0) {
        message += `✅ 格式转换成功: ${successful.join(', ')}`;
      }
      if (failed.length > 0) {
        if (message) message += '\n';
        message += `❌ 转换失败: ${failed.join(', ')}`;
      }
      
      if (message) {
        alert(message);
      }
      
    } catch (error) {
      console.error('[格式转换] 转换失败:', error);
      alert('格式转换失败，请重试');
    }
  };

  const generateMarkdownContent = (result: AnalysisResult): string => {
    let content = '# 文档分析报告\n\n';
    
    content += '## 摘要\n\n';
    content += result.summary + '\n\n';
    
    content += '## 关键要点\n\n';
    result.keyPoints.forEach((point, index) => {
      content += `${index + 1}. ${point}\n`;
    });
    content += '\n';
    
    content += '## 内容大纲\n\n';
    const renderOutline = (nodes: any[], level = 0) => {
      nodes.forEach(node => {
        const indent = '  '.repeat(level);
        content += `${indent}- ${node.title}\n`;
        if (node.content) {
          content += `${indent}  ${node.content}\n`;
        }
        if (node.children) {
          renderOutline(node.children, level + 1);
        }
      });
    };
    renderOutline(result.outline);
    
    return content;
  };

  const generateHTMLContent = (result: AnalysisResult): string => {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档分析报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .key-points { background: #f0fdf4; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
        .outline { margin-left: 20px; }
    </style>
</head>
<body>
    <h1>📖 文档分析报告</h1>
    
    <h2>📝 摘要</h2>
    <p>${result.summary}</p>
    
    <h2>🎯 关键要点</h2>
    <div class="key-points">
        <ul>
            ${result.keyPoints.map(point => `<li>${point}</li>`).join('')}
        </ul>
    </div>
    
    <h2>📋 内容大纲</h2>
    <div class="outline">
        ${generateHTMLOutline(result.outline)}
    </div>
</body>
</html>`;
  };

  const generateHTMLOutline = (nodes: any[]): string => {
    return '<ul>' + nodes.map(node => `
      <li>
        <strong>${node.title}</strong>
        ${node.content ? `<p>${node.content}</p>` : ''}
        ${node.children ? generateHTMLOutline(node.children) : ''}
      </li>
    `).join('') + '</ul>';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header lang={lang} onLangChange={(l)=>setLang(l)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 介绍区域 */}
          {appState === 'idle' && (
            <div className="text-center space-y-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {lang === 'en' ? 'Intelligent Document Analyzer' : '智能文档分析工具'}
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  {lang === 'en' ? 'Upload your document, choose features, and AI will generate summary, outline and mind map.' : '上传您的文档，选择需要的功能，AI 将为您生成摘要、大纲和思维导图'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-6 bg-white rounded-lg shadow-sm border">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📄</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{lang === 'en' ? 'Smart Parsing' : '智能解析'}</h3>
                    <p className="text-sm text-gray-600">{lang === 'en' ? 'Support multiple formats and extract key content' : '支持多种格式文档，智能提取核心内容'}</p>
                  </div>
                  
                  <div className="p-6 bg-white rounded-lg shadow-sm border">
                    <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🧠</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{lang === 'en' ? 'AI Analysis' : 'AI 分析'}</h3>
                    <p className="text-sm text-gray-600">{lang === 'en' ? 'Generate summary, outline and key points' : '生成摘要、大纲和关键要点'}</p>
                  </div>
                  
                  <div className="p-6 bg-white rounded-lg shadow-sm border">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🗺️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{lang === 'en' ? 'Mind Map' : '思维导图'}</h3>
                    <p className="text-sm text-gray-600">{lang === 'en' ? 'Visualize document structure and relations' : '可视化展示文档结构和逻辑关系'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 文件上传区域 */}
          {appState === 'idle' && (
            <FileUpload 
              onFileSelect={handleFileSelect}
              isProcessing={false}
            />
          )}

          {/* 功能选择区域 */}
          {appState === 'file-selected' && selectedFile && (
            <FunctionSelector
              fileInfo={selectedFile.info}
              onProceed={handleFunctionSelection}
              onCancel={handleCancel}
            />
          )}
          
          {/* 处理状态 */}
          {appState === 'processing' && (
            <ProcessingStatus 
              status={status}
              currentStep={currentStep}
              progress={progress}
            />
          )}
          
          {/* 错误显示 */}
          {error && (
            <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  handleCancel();
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                {lang === 'en' ? 'Restart' : '重新开始'}
              </button>
            </div>
          )}
          
          {/* 结果展示 */}
          {result && appState === 'completed' && (
            <div className="space-y-6">
              <ResultDisplay 
                result={result}
                onExport={handleExport}
                onFormatConvert={handleFormatConvert}
                preSelectedFormats={preSelectedExportFormats || undefined}
              />
              
              {/* 重新开始按钮 */}
              <div className="text-center">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 text-emerald-600 hover:text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded-lg transition-colors"
                >
                  {lang === 'en' ? 'Analyze another document' : '分析新文档'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 ReadFlow. 智能文档分析工具 - 让阅读更高效</p>
            <p className="mt-2">文件不会被保存，仅用于临时分析处理</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
