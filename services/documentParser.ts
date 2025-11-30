import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { ParsedDocument } from '../types';

// Configure PDF.js worker safely
// We handle different export structures to avoid "undefined" errors causing white screens
const configureWorker = () => {
  if (typeof window === 'undefined') return;

  const pdfJsAny = pdfjsLib as any;
  // Use a fallback version if the imported version is not available immediately
  const version = pdfJsAny.version || '5.4.449'; 
  const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

  if (pdfJsAny.GlobalWorkerOptions) {
    pdfJsAny.GlobalWorkerOptions.workerSrc = workerSrc;
  } else if (pdfJsAny.default && pdfJsAny.default.GlobalWorkerOptions) {
    pdfJsAny.default.GlobalWorkerOptions.workerSrc = workerSrc;
  }
};

configureWorker();

export const parseFile = async (file: File): Promise<ParsedDocument> => {
  if (file.type === 'application/pdf') {
    return parsePdf(file);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDocx(file);
  } else {
    throw new Error('Formato de archivo no soportado. Por favor suba un PDF o Word (.docx).');
  }
};

const parsePdf = async (file: File): Promise<ParsedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Handle both default and named export for getDocument
  const pdfJsAny = pdfjsLib as any;
  const getDocument = pdfJsAny.getDocument || (pdfJsAny.default && pdfJsAny.default.getDocument);

  if (!getDocument) {
    throw new Error("La biblioteca PDF no se ha cargado correctamente.");
  }

  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // @ts-ignore - 'str' exists on TextItem
      .map((item) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  // Split by double newlines or punctuation to create logical paragraphs for reading
  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return {
    fileName: file.name,
    paragraphs,
  };
};

const parseDocx = async (file: File): Promise<ParsedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Handle mammoth default export safely
  const mammothLib = (mammoth as any).default || mammoth;
  
  if (!mammothLib || !mammothLib.extractRawText) {
     throw new Error("La biblioteca DOCX no se ha cargado correctamente.");
  }

  const result = await mammothLib.extractRawText({ arrayBuffer });
  
  const paragraphs = result.value
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return {
    fileName: file.name,
    paragraphs,
  };
};