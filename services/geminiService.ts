import { GoogleGenAI, Modality } from "@google/genai";

// Use process.env.API_KEY directly as per guidelines. 
// Assume the environment is valid and pre-configured.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// The Gemini TTS model returns audio at 24kHz
export const TTS_SAMPLE_RATE = 24000;

// Helper to decode Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  if (!text || text.trim().length === 0) {
    throw new Error("El texto está vacío.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { 
              // 'Kore' is a sweet, feminine voice suitable for reading
              voiceName: 'Kore' 
            },
          },
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini API.");
    }

    const inlineData = candidates[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData || !inlineData.data) {
      throw new Error("No audio data returned in the response.");
    }

    return base64ToArrayBuffer(inlineData.data);
  } catch (error) {
    console.error("Error calling Gemini TTS:", error);
    throw error;
  }
};