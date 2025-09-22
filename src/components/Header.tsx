import React from 'react';
import { BookOpen, Zap } from 'lucide-react';
import type { UILanguage } from '../types';

interface HeaderProps {
  lang?: UILanguage;
  onLangChange?: (lang: UILanguage) => void;
}

export default function Header({ lang = 'en', onLangChange }: HeaderProps) {
  const t = (zh: string, en: string) => (lang === 'en' ? en : zh);
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ReadFlow</h1>
              <p className="text-xs text-gray-500">{t('智能文档分析工具','Intelligent Document Analyzer')}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>{lang === 'en' ? 'AI Powered' : 'AI 驱动分析'}</span>
            </div>

            {/* Language Toggle */}
            <div className="flex items-center bg-gray-100 rounded-md p-1">
              <button
                onClick={() => onLangChange?.('zh')}
                className={`px-3 py-1 text-sm rounded ${lang === 'zh' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
              >
                {t('中文','中文')}
              </button>
              <button
                onClick={() => onLangChange?.('en')}
                className={`px-3 py-1 text-sm rounded ${lang === 'en' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
