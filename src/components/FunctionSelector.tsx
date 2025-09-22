import React, { useState } from 'react';
import { FileText, Brain, Share2, Download, Zap, DollarSign } from 'lucide-react';
import type { FileInfo } from '../types';

interface FunctionOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  price: number;
  isFree?: boolean;
  category: 'analysis' | 'conversion';
}

interface FunctionSelectorProps {
  fileInfo: FileInfo;
  onProceed: (selectedFunctions: string[], exportFormats?: ('pdf' | 'docx' | 'md' | 'html')[]) => void;
  onCancel: () => void;
}

const FUNCTION_OPTIONS: FunctionOption[] = [
  {
    id: 'summary',
    name: 'AI 摘要总结',
    description: '生成文档的智能摘要和关键要点',
    icon: FileText,
    price: 0.5,
    category: 'analysis'
  },
  {
    id: 'outline',
    name: '内容大纲',
    description: '提取文档结构，生成层次化大纲',
    icon: Brain,
    price: 0.3,
    category: 'analysis'
  },
  {
    id: 'mindmap',
    name: '思维导图',
    description: '生成可视化思维导图',
    icon: Share2,
    price: 0.7,
    category: 'analysis'
  },
  {
    id: 'convert_basic',
    name: '基础格式转换',
    description: '同时导出多种格式：PDF、Word、Markdown、HTML',
    icon: Download,
    price: 0,
    isFree: true,
    category: 'conversion'
  },
  {
    id: 'convert_ai',
    name: 'AI 智能转换',
    description: 'AI 优化的格式转换，保持更好的排版',
    icon: Zap,
    price: 0.4,
    category: 'conversion'
  }
];

export default function FunctionSelector({ fileInfo, onProceed, onCancel }: FunctionSelectorProps) {
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedExportFormats, setSelectedExportFormats] = useState<('pdf' | 'docx' | 'md' | 'html')[]>(['pdf']);
  

  const toggleFunction = (functionId: string) => {
    setSelectedFunctions(prev => 
      prev.includes(functionId)
        ? prev.filter(id => id !== functionId)
        : [...prev, functionId]
    );
  };

  const toggleExportFormat = (format: 'pdf' | 'docx' | 'md' | 'html') => {
    setSelectedExportFormats(prev => {
      if (prev.includes(format)) {
        // 如果已选择，则移除（但至少保留一个）
        return prev.length > 1 ? prev.filter(f => f !== format) : prev;
      } else {
        // 如果未选择，则添加
        return [...prev, format];
      }
    });
  };

  const getTotalPrice = () => {
    return selectedFunctions.reduce((total, funcId) => {
      const func = FUNCTION_OPTIONS.find(f => f.id === funcId);
      return total + (func?.price || 0);
    }, 0);
  };

  const analysisOptions = FUNCTION_OPTIONS.filter(opt => opt.category === 'analysis');
  const conversionOptions = FUNCTION_OPTIONS.filter(opt => opt.category === 'conversion');

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* 文件信息头部 */}
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">选择处理功能</h3>
              <p className="text-sm text-gray-600 mt-1">
                文件：{fileInfo.name} ({(fileInfo.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                ${getTotalPrice().toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">预计费用</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* AI 分析功能 */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-emerald-600" />
              AI 智能分析
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analysisOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedFunctions.includes(option.id);
                
                return (
                  <div
                    key={option.id}
                    onClick={() => toggleFunction(option.id)}
                    className={`
                      relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`
                        p-2 rounded-lg flex-shrink-0
                        ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}
                      `}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 text-sm">{option.name}</h5>
                        <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-emerald-600">
                            ${option.price.toFixed(2)}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            
          </div>

          {/* 格式转换功能 */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <Download className="w-5 h-5 mr-2 text-emerald-600" />
              格式转换
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conversionOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedFunctions.includes(option.id);
                
                return (
                  <div
                    key={option.id}
                    onClick={() => toggleFunction(option.id)}
                    className={`
                      relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`
                        p-2 rounded-lg flex-shrink-0
                        ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}
                      `}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900 text-sm">{option.name}</h5>
                          {option.isFree && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              免费
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-sm font-semibold ${option.isFree ? 'text-green-600' : 'text-emerald-600'}`}>
                            {option.isFree ? '免费' : `$${option.price.toFixed(2)}`}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 导出格式选择 */}
      {selectedFunctions.includes('convert_basic') && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Download className="w-4 h-4 mr-2 text-emerald-600" />
            选择转换格式
          </h5>
          <p className="text-xs text-gray-600 mb-3">
            将原始文档转换为其他格式（不改变内容）
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'pdf', label: 'PDF 文档', desc: '便携文档格式' },
              { value: 'docx', label: 'Word 文档', desc: 'Microsoft Word' },
              { value: 'md', label: 'Markdown', desc: '标记语言' },
              { value: 'html', label: 'HTML 网页', desc: '网页格式' }
            ].filter(format => {
              // 排除与原始文件相同的格式
              const fileType = fileInfo.type || '';
              if (fileType === 'pdf' && format.value === 'pdf') return false;
              if (['doc', 'docx'].includes(fileType) && format.value === 'docx') return false;
              return true;
            }).map((format) => (
                    <label 
                      key={format.value}
                      className="flex items-center space-x-2 cursor-pointer group p-2 rounded hover:bg-emerald-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExportFormats.includes(format.value as any)}
                        onChange={() => toggleExportFormat(format.value as any)}
                        className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                      />
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
                <div className="mt-2 text-xs text-gray-500">
                  已选择: {selectedExportFormats.map(f => f.toUpperCase()).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  已选择 {selectedFunctions.length} 个功能
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  总计：<span className="text-emerald-600">${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={() => onProceed(selectedFunctions, selectedFunctions.includes('convert_basic') ? selectedExportFormats : undefined)}
                disabled={selectedFunctions.length === 0}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-all duration-200
                  ${selectedFunctions.length > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {getTotalPrice() > 0 ? (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>支付并开始处理</span>
                  </div>
                ) : (
                  <span>开始处理</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
