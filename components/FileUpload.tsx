import React, { useRef, useState } from 'react';
import { FileType } from '../types';
import { DocumentArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    if (file.type === FileType.PDF || file.type === FileType.DOCX) {
      onFileSelect(file);
    } else {
      alert("Por favor sube un archivo .pdf o .docx");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragging 
            ? 'border-rose-400 bg-rose-50' 
            : 'border-slate-300 hover:border-rose-300 hover:bg-slate-50'
          }
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept=".pdf,.docx"
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
          ) : (
            <>
              <div className="p-4 bg-white rounded-full shadow-sm text-rose-500">
                <DocumentArrowUpIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800">
                  Sube tu documento
                </h3>
                <p className="text-slate-500 mt-1">
                  Arrastra un archivo PDF o Word aquí, o haz clic para seleccionar
                </p>
              </div>
              <div className="flex gap-2 text-xs text-slate-400 uppercase tracking-wider">
                <span className="bg-slate-100 px-2 py-1 rounded">PDF</span>
                <span className="bg-slate-100 px-2 py-1 rounded">DOCX</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;