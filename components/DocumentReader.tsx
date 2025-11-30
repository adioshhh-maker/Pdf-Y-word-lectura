import React, { useEffect, useRef, useState } from 'react';
import { ParsedDocument } from '../types';
import { generateSpeech, TTS_SAMPLE_RATE } from '../services/geminiService';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, CursorArrowRaysIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';

interface DocumentReaderProps {
  document: ParsedDocument;
  onBack: () => void;
}

// How many paragraphs ahead to buffer
const BUFFER_SIZE = 5;

const DocumentReader: React.FC<DocumentReaderProps> = ({ document: docData, onBack }) => {
  // State
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Caching & Buffering
  const audioCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const pendingRequestsRef = useRef<Set<number>>(new Set());
  const isPlayingRef = useRef(false);

  // Initialize Audio Context Safely
  useEffect(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    } catch (e) {
      console.error("AudioContext initialization failed", e);
    }

    // Initial buffer: Start fetching the beginning of the document immediately
    manageBuffer(0);
    
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update ref when state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Watch selected index to keep the buffer full ahead of the user
  useEffect(() => {
    if (selectedIndex !== null) {
      manageBuffer(selectedIndex);
    }
  }, [selectedIndex]);

  // Helper to convert Raw PCM (16-bit, 24kHz, Mono) to AudioBuffer
  const createAudioBufferFromPCM = (buffer: ArrayBuffer, context: AudioContext): AudioBuffer => {
    const pcm16 = new Int16Array(buffer);
    const channels = 1; // Gemini TTS is Mono
    
    // Create an AudioBuffer with the correct sample rate
    const audioBuffer = context.createBuffer(channels, pcm16.length, TTS_SAMPLE_RATE);
    
    // Get the channel data to fill (returns a Float32Array)
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert Int16 PCM to Float32 [-1.0, 1.0]
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768.0;
    }
    
    return audioBuffer;
  };

  // Background Buffering Logic
  const manageBuffer = async (currentIndex: number) => {
    if (!audioContextRef.current) return;

    // We want to ensure [currentIndex ... currentIndex + BUFFER_SIZE] are cached
    for (let i = 0; i <= BUFFER_SIZE; i++) {
      const targetIndex = currentIndex + i;
      
      // Stop if out of bounds
      if (targetIndex >= docData.paragraphs.length) break;

      // Skip if already cached or currently being fetched
      if (audioCacheRef.current.has(targetIndex) || pendingRequestsRef.current.has(targetIndex)) {
        continue;
      }

      // Add to pending set
      pendingRequestsRef.current.add(targetIndex);

      // Fetch in background (fire and forget basically, but sequential per iteration to avoid hammering too hard if strictly sequential is needed, 
      // but here we run async to parallelize slightly within the loop speed)
      generateSpeech(docData.paragraphs[targetIndex])
        .then(buffer => {
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            const audioBuffer = createAudioBufferFromPCM(buffer, audioContextRef.current);
            audioCacheRef.current.set(targetIndex, audioBuffer);
          }
        })
        .catch(err => {
          console.warn(`Buffer failed for index ${targetIndex}`, err);
        })
        .finally(() => {
          pendingRequestsRef.current.delete(targetIndex);
        });
    }
  };

  // Handle playing audio
  const playAudio = async (index: number) => {
    if (!audioContextRef.current || index >= docData.paragraphs.length) {
        setIsPlaying(false);
        return;
    }
    
    // Resume context if suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Update UI immediately
    setSelectedIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    // Stop any current audio
    if (audioSourceRef.current) {
        audioSourceRef.current.onended = null;
        try { audioSourceRef.current.stop(); } catch(e) {}
    }

    try {
      let audioBuffer: AudioBuffer;

      // Check Cache FIRST
      if (audioCacheRef.current.has(index)) {
        audioBuffer = audioCacheRef.current.get(index)!;
      } else {
        // Cache miss - we need to fetch this SPECIFIC one with high priority
        // Even if it's in pendingRequests, we await the result here ideally, 
        // but simpler is to just call generateSpeech directly.
        // Note: We don't check pendingRequestsRef here to keep logic simple: 
        // if the user clicked it, we want it NOW. The background fetch will just overwrite or be redundant (harmless).
        setIsLoadingAudio(true);
        const audioBufferData = await generateSpeech(docData.paragraphs[index]);
        
        // Check if user stopped while loading
        if (!isPlayingRef.current && index !== selectedIndex) {
            setIsLoadingAudio(false);
            return;
        }

        audioBuffer = createAudioBufferFromPCM(audioBufferData, audioContextRef.current);
        audioCacheRef.current.set(index, audioBuffer);
        setIsLoadingAudio(false);
      }

      // Double check play state after async gap
      if (!isPlayingRef.current) return;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (isPlayingRef.current) {
            playAudio(index + 1);
        }
      };

      source.start(0);
      audioSourceRef.current = source;
    } catch (err) {
      console.error("Failed to play audio", err);
      setIsPlaying(false);
      setIsLoadingAudio(false);
      // Optional: Auto-skip broken paragraph?
      // playAudio(index + 1); 
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  const togglePlay = () => {
      if (isPlaying) {
          stopAudio();
      } else {
          const indexToPlay = selectedIndex !== null ? selectedIndex : 0;
          playAudio(indexToPlay);
      }
  };

  const handleNext = () => {
      const nextIdx = (selectedIndex ?? -1) + 1;
      if (nextIdx < docData.paragraphs.length) {
          playAudio(nextIdx);
      }
  };

  const handlePrev = () => {
      const prevIdx = (selectedIndex ?? 0) - 1;
      if (prevIdx >= 0) {
          playAudio(prevIdx);
      }
  };

  const handleParagraphClick = (index: number) => {
    setSelectedIndex(index);
    if (isPlaying) {
        playAudio(index);
    }
  };

  const handleDoubleClick = (index: number) => {
      playAudio(index);
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (selectedIndex !== null) {
            e.preventDefault();
            playAudio(selectedIndex);
        }
    } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    } else if (e.key === 'ArrowRight') {
        if (isPlaying) {
            e.preventDefault();
            handleNext();
        }
    } else if (e.key === 'ArrowLeft') {
        if (isPlaying) {
            e.preventDefault();
            handlePrev();
        }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, isPlaying]);

  // Scroll active paragraph into view smoothly
  useEffect(() => {
    if (selectedIndex !== null) {
      const element = document.getElementById(`paragraph-${selectedIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-white shadow-2xl overflow-hidden relative border-x border-slate-100">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between z-10 sticky top-0 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => { stopAudio(); onBack(); }}
            className="text-slate-400 hover:text-slate-700 transition-colors p-2 hover:bg-slate-50 rounded-full"
          >
            <span className="sr-only">Volver</span>
            ←
          </button>
          <div className="flex flex-col overflow-hidden">
            <h2 className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
              {docData.fileName}
            </h2>
            <span className="text-xs text-slate-400">
              {selectedIndex !== null ? `${selectedIndex + 1} / ` : ''}{docData.paragraphs.length} párrafos
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {isLoadingAudio && (
             <div className="flex items-center gap-2 text-rose-500 text-xs font-medium animate-pulse mr-2">
                <SpeakerWaveIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Generando...</span>
             </div>
          )}
          
          <div className="flex items-center bg-slate-100 rounded-full p-1 gap-1">
             <button
                onClick={handlePrev}
                disabled={!selectedIndex || selectedIndex === 0}
                className="p-2 rounded-full text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                title="Párrafo anterior"
             >
                <BackwardIcon className="w-5 h-5" />
             </button>

             <button 
                  onClick={togglePlay}
                  disabled={selectedIndex === null && !isPlaying}
                  className={`p-3 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md ${
                      isPlaying
                      ? 'bg-rose-500 text-white shadow-rose-200'
                      : 'bg-white text-slate-700 hover:text-rose-600'
                  }`}
               >
                  {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
             </button>

             <button
                onClick={handleNext}
                disabled={selectedIndex === null || selectedIndex >= docData.paragraphs.length - 1}
                className="p-2 rounded-full text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                title="Siguiente párrafo"
             >
                <ForwardIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 sm:p-16 font-serif text-lg sm:text-xl leading-loose text-slate-700 space-y-8 scroll-smooth"
      >
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-8 border-b border-slate-100 pb-4">
            <CursorArrowRaysIcon className="w-3 h-3" />
            <span>Clic para seleccionar &bull; Doble clic para reproducir &bull; Enter para iniciar</span>
        </div>

        {docData.paragraphs.map((text, idx) => (
          <p
            key={idx}
            id={`paragraph-${idx}`}
            onClick={() => handleParagraphClick(idx)}
            onDoubleClick={() => handleDoubleClick(idx)}
            className={`
              cursor-pointer rounded-xl p-6 transition-all duration-300 relative select-none
              ${selectedIndex === idx 
                ? 'bg-rose-50 text-slate-900 shadow-sm ring-2 ring-rose-100' 
                : 'hover:bg-slate-50 text-slate-600'
              }
            `}
          >
            {/* Visual Indicator for Cursor/Selection */}
            {selectedIndex === idx && (
              <span className={`absolute left-0 top-6 -ml-3 sm:-ml-4 w-1.5 h-8 bg-rose-400 rounded-r-full ${isPlaying ? 'animate-pulse' : ''}`}></span>
            )}
            {text}
          </p>
        ))}
        
        <div className="h-40 flex items-center justify-center text-slate-300 text-sm italic">
          --- Fin del documento ---
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;