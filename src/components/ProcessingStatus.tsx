import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ProcessingStatus } from '../types';

interface ProcessingStatusProps {
  status: ProcessingStatus;
  currentStep?: string;
  progress?: number;
}

const STATUS_MESSAGES: Record<ProcessingStatus, string> = {
  idle: '等待上传文件',
  uploading: '上传文件中...',
  parsing: '解析文件内容...',
  analyzing: 'AI 分析中...',
  generating: '生成思维导图...',
  completed: '处理完成！',
  error: '处理出错',
};

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  idle: 'text-gray-500',
  uploading: 'text-blue-500',
  parsing: 'text-yellow-500',
  analyzing: 'text-purple-500',
  generating: 'text-emerald-500',
  completed: 'text-green-500',
  error: 'text-red-500',
};

export default function ProcessingStatus({ status, currentStep, progress }: ProcessingStatusProps) {
  const isProcessing = !['idle', 'completed', 'error'].includes(status);

  const renderIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        ) : null;
    }
  };

  if (status === 'idle') {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          {renderIcon()}
          <h3 className={`text-lg font-medium ${STATUS_COLORS[status]}`}>
            {STATUS_MESSAGES[status]}
          </h3>
        </div>

        {currentStep && (
          <p className="text-sm text-gray-600 mb-4">{currentStep}</p>
        )}

        {isProcessing && progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            处理过程中出现错误，请重试或联系客服。
          </div>
        )}
      </div>
    </div>
  );
}
