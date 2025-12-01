# AI RECONSTRUCTION BLUEPRINT

> **INSTRUCCIONES PARA EL AGENTE DE IA:**
> Si se te pide recrear, modificar o mantener este proyecto, DEBES adherirte estrictamente a las siguientes especificaciones técnicas y de diseño. Este archivo contiene la "esencia" del proyecto que no debe perderse.

## 1. Identidad Visual y UX
*   **Nombre:** NeuroReader.
*   **Estilo:** Minimalista, limpio, "Cozy Reading".
*   **Paleta de Colores (Tailwind):**
    *   Fondo principal: `bg-slate-50`.
    *   Texto principal: `text-slate-800` / `text-slate-700`.
    *   Acento/Interacción: Familia `rose` (`rose-500` para botones, `rose-50` para fondos activos, `rose-100` para bordes).
*   **Tipografía:**
    *   UI: `Inter` (sans-serif).
    *   Cuerpo del documento: `Merriweather` (serif) con `leading-loose` para legibilidad.
*   **Feedback Visual:**
    *   El párrafo activo debe resaltarse con `bg-rose-50` y un indicador visual a la izquierda (barra vertical).
    *   Scroll suave automático hacia el párrafo activo.

## 2. Motor de Audio (CRÍTICO)
El manejo de audio es la parte más compleja y frágil del sistema.
*   **Modelo:** `gemini-2.5-flash-preview-tts`.
*   **Configuración de Voz:** `voiceName: 'Kore'` (NO cambiar, es la firma del producto).
*   **Formato de Salida:** La API devuelve **RAW PCM**.
    *   **NO** intentar usar `audioContext.decodeAudioData` (fallará).
    *   **SÍ** convertir manualmente: `Int16Array` -> `Float32Array` -> `AudioBuffer`.
    *   **Sample Rate:** Debe fijarse en `24000`.
*   **Estrategia de Buffering (Aggressive Smart Caching):**
    *   Al cargar el documento: Descargar inmediatamente párrafo 0.
    *   Al reproducir párrafo `N`: Verificar y descargar en segundo plano `N+1` hasta `N+5`.
    *   Evitar peticiones duplicadas usando un `Set` de peticiones pendientes (`pendingRequestsRef`).
    *   Al saltar manualmente: Cancelar lógica de reproducción anterior y priorizar el nuevo índice.

## 3. Lógica de Negocio (DocumentReader.tsx)
*   **Interacción:**
    *   Click simple: Selecciona (mueve el cursor) pero NO reproduce automáticamente (para no interrumpir lectura visual).
    *   Doble Click: Reproduce inmediatamente.
    *   Enter: Reproduce el seleccionado.
*   **Manejo de Archivos:**
    *   Usar `pdfjs-dist` para PDF (configurar worker correctamente para entorno navegador/CDN).
    *   Usar `mammoth` para .docx.
    *   Segmentación: Dividir texto por dobles saltos de línea `\n\n` para crear párrafos lógicos.

## 4. Stack Tecnológico
*   React 19 (Componentes funcionales).
*   Tailwind CSS (vía CDN para portabilidad).
*   `@google/genai` SDK.
*   HeroIcons para iconografía.
*   **Manejo de Errores:** Siempre envolver la aplicación en un `ErrorBoundary` para evitar pantallas blancas.

## 5. Prompt de Ejemplo para Reconstrucción
Si el usuario pide "Házmelo de nuevo", usa este prompt mental:
*"Genera una aplicación React de lectura de documentos. Usa Tailwind con colores Rose/Slate. Implementa un lector de PDF/Word que use Gemini 2.5 Flash TTS con la voz 'Kore'. Es CRÍTICO que implementes un buffer de audio manual para decodificar PCM a 24kHz y un sistema de precarga de los siguientes 5 párrafos para evitar latencia. La interfaz debe permitir hacer clic para seleccionar y enter para leer."*
