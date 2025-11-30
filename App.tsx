import React, { useState, ReactNode, ErrorInfo } from 'react';
import FileUpload from './components/FileUpload';
import DocumentReader from './components/DocumentReader';
import { parseFile } from './services/documentParser';
import { ParsedDocument } from './types';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">¡Ups! Algo salió mal.</h2>
            <p className="text-slate-600 mb-6">
              Ocurrió un error inesperado. Por favor intenta recargar la página.
            </p>
            <pre className="text-xs bg-slate-100 p-4 rounded text-left overflow-auto mb-6 max-h-32 text-slate-500">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [currentDoc, setCurrentDoc] = useState<ParsedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await parseFile(file);
      setCurrentDoc(parsed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar el archivo. Asegúrate de que es un PDF o DOCX válido.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentDoc(null);
    setError(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {!currentDoc ? (
          <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <div className="text-center mb-10 max-w-lg">
              <div className="inline-flex items-center justify-center p-3 bg-rose-100 rounded-2xl mb-6 text-rose-600 shadow-sm">
                <SparklesIcon className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
                NeuroReader
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                Experimenta una lectura natural con nuestra voz neural dulce y humana. 
                Sube tus documentos PDF o Word para comenzar.
              </p>
            </div>

            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 max-w-md text-center text-sm">
                {error}
              </div>
            )}

            <div className="mt-16 text-slate-400 text-sm">
              Potenciado por Gemini 2.5 TTS Neural
            </div>
          </div>
        ) : (
          <DocumentReader document={currentDoc} onBack={handleBack} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;