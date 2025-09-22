// 文件类型定义
export type SupportedFileType = 'pdf' | 'epub' | 'mobi' | 'azw3' | 'docx' | 'md' | 'html';

// 处理状态
export type ProcessingStatus = 'idle' | 'uploading' | 'parsing' | 'converting' | 'analyzing' | 'generating' | 'completed' | 'error';

// 文件信息
export interface FileInfo {
  name: string;
  size: number;
  type: SupportedFileType;
  content?: string;
}

// AI分析结果
export interface AnalysisResult {
  summary: string;
  summary_en?: string;
  outline: OutlineNode[];
  outline_en?: OutlineNode[];
  mindMapData: MindMapNode;
  mindMapData_en?: MindMapNode;
  keyPoints: string[];
  keyPoints_en?: string[];
}

// 大纲节点
export interface OutlineNode {
  id: string;
  title: string;
  title_en?: string;
  level: number;
  children?: OutlineNode[];
  content?: string;
  content_en?: string;
}

// 思维导图节点
export interface MindMapNode {
  id: string;
  label: string;
  label_en?: string;
  children?: MindMapNode[];
  color?: string;
  size?: number;
}

// 语言
export type UILanguage = 'zh' | 'en';

// 导出选项
export interface ExportOptions {
  formats: ('pdf' | 'docx' | 'md' | 'html')[];
  includeImages?: boolean;
  template?: string;
}

// API响应
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
