import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import type { SupportedFileType, FileInfo } from '../types';

interface FileUploadProps {
  onFileSelect: (file: FileInfo, fileObject: File) => void;
  isProcessing: boolean;
}

const SUPPORTED_TYPES: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'application/epub+zip': 'epub',
  'application/x-mobipocket-ebook': 'mobi',
  'application/vnd.amazon.ebook': 'azw3',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/markdown': 'md',
  'text/html': 'html',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string; type?: SupportedFileType } => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: '文件大小不能超过50MB' };
    }

    const fileType = SUPPORTED_TYPES[file.type];
    if (!fileType) {
      // 根据文件扩展名判断
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extToType: Record<string, SupportedFileType> = {
        pdf: 'pdf',
        epub: 'epub',
        mobi: 'mobi',
        azw3: 'azw3',
        docx: 'docx',
        md: 'md',
        html: 'html',
      };
      
      const typeFromExt = ext ? extToType[ext] : undefined;
      if (!typeFromExt) {
        return { valid: false, error: '不支持的文件格式' };
      }
      return { valid: true, type: typeFromExt };
    }

    return { valid: true, type: fileType };
  };

  const handleFileSelect = (file: File) => {
    console.log('[文件上传] 开始处理文件选择', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    setError(null);
    const validation = validateFile(file);
    
    console.log('[文件上传] 文件验证结果', {
      valid: validation.valid,
      detectedType: validation.type,
      error: validation.error
    });
    
    if (!validation.valid) {
      console.error('[文件上传] 文件验证失败:', validation.error);
      setError(validation.error!);
      return;
    }

    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      type: validation.type!,
    };

    console.log('[文件上传] 文件信息准备完成，调用回调函数', fileInfo);
    onFileSelect(fileInfo, file);
    console.log('[文件上传] 文件选择处理完成');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${dragOver 
            ? 'border-emerald-400 bg-emerald-50' 
            : 'border-gray-300 hover:border-emerald-300 hover:bg-emerald-50/50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!isProcessing ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.epub,.mobi,.azw3,.docx,.md,.html"
          onChange={handleInputChange}
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full ${dragOver ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            {isProcessing ? (
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            ) : (
              <Upload className={`w-8 h-8 ${dragOver ? 'text-emerald-600' : 'text-gray-600'}`} />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isProcessing ? '处理中...' : '上传您的文档'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              拖拽文件到此处，或点击选择文件
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-100 rounded">PDF</span>
              <span className="px-2 py-1 bg-gray-100 rounded">EPUB</span>
              <span className="px-2 py-1 bg-gray-100 rounded">MOBI</span>
              <span className="px-2 py-1 bg-gray-100 rounded">AZW3</span>
              <span className="px-2 py-1 bg-gray-100 rounded">DOCX</span>
              <span className="px-2 py-1 bg-gray-100 rounded">MD</span>
              <span className="px-2 py-1 bg-gray-100 rounded">HTML</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          最大文件大小：50MB | 文件内容不会被保存，仅用于临时处理
        </p>
      </div>
    </div>
  );
}
