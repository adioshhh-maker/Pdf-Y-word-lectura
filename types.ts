export interface ParsedDocument {
  fileName: string;
  paragraphs: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number | null;
  isLoading: boolean;
  error: string | null;
}

export enum FileType {
  PDF = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
