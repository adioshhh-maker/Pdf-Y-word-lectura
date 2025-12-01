# NeuroReader 🧠🎧

**NeuroReader** es una aplicación web de lectura de documentos (PDF y DOCX) que utiliza inteligencia artificial generativa para convertir texto a voz (TTS) con una calidad neural humana y dulce.

## ✨ Características Principales

- **Voz Neural Premium:** Utiliza el modelo `gemini-2.5-flash-preview-tts` de Google con la voz preconfigurada "Kore" (femenina, dulce).
- **Lectura Continua Inteligente (Smart Buffering):**
  - Sistema de "Aggressive Caching" que precarga los siguientes 5 párrafos en segundo plano.
  - Eliminación de latencia entre párrafos.
  - Gestión de cola para priorizar saltos manuales del usuario.
- **Soporte de Archivos:**
  - PDF (vía `pdfjs-dist`).
  - Word/DOCX (vía `mammoth`).
- **Interfaz "Focus Mode":**
  - Diseño minimalista y limpio con paleta de colores Rose/Slate.
  - Tipografía optimizada para lectura (Inter para UI, Merriweather para texto).
- **Controles de Navegación:**
  - Clic para seleccionar.
  - Doble clic para reproducir inmediatamente.
  - Tecla `Enter` para iniciar/pausar.
  - Flechas direccionales para navegar.

## 🛠 Tecnologías

- **Frontend:** React 19, Tailwind CSS.
- **AI Core:** Google GenAI SDK (`@google/genai`).
- **Audio Engine:** Web Audio API con decodificación manual de PCM Raw (24kHz).
- **Buildless:** Funciona directamente en el navegador con módulos ES vía CDN (sin Node.js/Vite local necesario para ejecutar el HTML).

## 🚀 Instalación y Uso

1. Clona este repositorio.
2. Crea un archivo `.env` (o configura la variable de entorno) con tu API KEY de Google:
   ```
   API_KEY=tu_api_key_aqui
   ```
3. Sirve el archivo `index.html` usando cualquier servidor estático (Live Server, Python SimpleHTTPServer, etc.).

## 📝 Notas Técnicas Importantes

El modelo de Gemini devuelve audio en formato **RAW PCM (16-bit, 24kHz, Mono)**. Este proyecto implementa un decodificador manual (`createAudioBufferFromPCM` en `DocumentReader.tsx`) ya que los navegadores no pueden decodificar este formato nativamente sin cabeceras WAV.

---
*Creado con asistencia de IA - 2025*