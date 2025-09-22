import React, { useState } from 'react';
import { Download, FileText, Share2, Eye } from 'lucide-react';
import type { AnalysisResult, ExportOptions } from '../types';
import MindMapViewer from './MindMapViewer';

interface ResultDisplayProps {
  result: AnalysisResult;
  onExport: (options: ExportOptions) => void;
  onFormatConvert?: (formats: ('pdf' | 'docx' | 'md' | 'html')[]) => void;
  isExporting?: boolean;
  preSelectedFormats?: ('pdf' | 'docx' | 'md' | 'html')[];
}

export default function ResultDisplay({ result, onExport, onFormatConvert, isExporting, preSelectedFormats }: ResultDisplayProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'outline' | 'mindmap'>('summary');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<('pdf' | 'docx' | 'md' | 'html')[]>(preSelectedFormats || ['pdf']);

  const handleFormatToggle = (format: 'pdf' | 'docx' | 'md' | 'html') => {
    setSelectedFormats(prev => {
      if (prev.includes(format)) {
        // 如果已选择，则移除（但至少保留一个）
        return prev.length > 1 ? prev.filter(f => f !== format) : prev;
      } else {
        // 如果未选择，则添加
        return [...prev, format];
      }
    });
  };

  const handleExport = () => {
    if (selectedFormats.length === 0) {
      alert('请至少选择一种导出格式');
      return;
    }
    onExport({ formats: selectedFormats });
    setShowExportOptions(false);
  };

  const handleFormatConversion = () => {
    if (selectedFormats.length === 0) {
      alert('请至少选择一种转换格式');
      return;
    }
    if (onFormatConvert) {
      onFormatConvert(selectedFormats);
    } else {
      alert('格式转换功能暂不可用');
    }
  };

  const tabs = [
    { id: 'summary', label: '摘要总结', icon: FileText },
    { id: 'outline', label: '内容大纲', icon: Eye },
    { id: 'mindmap', label: '思维导图', icon: Share2 },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* 标签栏 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200
                    ${activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">文档摘要</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{result.summary}</p>
                </div>
              </div>
              
              {result.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">关键要点</h3>
                  <ul className="space-y-2">
                    {result.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'outline' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">内容大纲</h3>
              <div className="space-y-3">
                {result.outline.map((node) => (
                  <OutlineNode key={node.id} node={node} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">思维导图</h3>
              <MindMapViewer data={result.mindMapData} />
            </div>
          )}
        </div>

        {/* 导出和格式转换 */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            {/* 格式选择区域 */}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">
                选择输出格式
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'pdf', label: 'PDF 文档', desc: '便携文档格式' },
                  { value: 'docx', label: 'Word 文档', desc: 'Microsoft Word' },
                  { value: 'md', label: 'Markdown', desc: '标记语言' },
                  { value: 'html', label: 'HTML 网页', desc: '网页格式' }
                ].map((format) => (
                  <label 
                    key={format.value}
                    className="flex items-center space-x-2 cursor-pointer group"
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={selectedFormats.includes(format.value as any)}
                        onChange={() => handleFormatToggle(format.value as any)}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                      />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {format.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              {/* 选择提示 */}
              {selectedFormats.length > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  已选择: {selectedFormats.map(f => f.toUpperCase()).join(', ')}
                </div>
              )}
            </div>

            {/* 两种导出选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 导出分析报告 */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">📄 导出分析报告</h4>
                <p className="text-xs text-gray-600 mb-3">导出AI生成的摘要、大纲和要点</p>
                <button
                  onClick={handleExport}
                  disabled={isExporting || selectedFormats.length === 0}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting 
                      ? '导出中...' 
                      : `导出分析报告 (${selectedFormats.length}种格式)`
                    }
                  </span>
                </button>
              </div>

              {/* 格式转换下载 */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">🔄 格式转换下载</h4>
                <p className="text-xs text-gray-600 mb-3">将原文档转换为其他格式下载</p>
                <button
                  onClick={handleFormatConversion}
                  disabled={isExporting || selectedFormats.length === 0 || !onFormatConvert}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting 
                      ? '转换中...' 
                      : `转换原文档 (${selectedFormats.length}种格式)`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 大纲节点组件
function OutlineNode({ node, level = 0 }: { node: any; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  return (
    <div className={`${level > 0 ? 'ml-6' : ''}`}>
      <div className="flex items-start space-x-2">
        {node.children && node.children.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-4 h-4 mt-1 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <div className="flex-1">
          <h4 className={`font-medium ${level === 0 ? 'text-lg text-gray-900' : level === 1 ? 'text-base text-gray-800' : 'text-sm text-gray-700'}`}>
            {node.title}
          </h4>
          {node.content && (
            <p className="mt-1 text-sm text-gray-600">{node.content}</p>
          )}
        </div>
      </div>
      
      {isExpanded && node.children && (
        <div className="mt-2 space-y-2">
          {node.children.map((child: any) => (
            <OutlineNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
