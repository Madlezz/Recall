/**
 * Voice input service using Web Speech API (SpeechRecognition).
 * Fully offline — uses the browser/engine's built-in speech recognition.
 * No cloud dependency, no API keys, no telemetry.
 *
 * Falls back gracefully if the browser/Tauri runtime doesn't support it.
 */

// TypeScript doesn't ship types for SpeechRecognition yet.
// These minimal declarations cover what we use.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  // Chrome provides webkitSpeechRecognition; Firefox/Safari may provide SpeechRecognition
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

let _recognition: SpeechRecognitionLike | null = null;
let _listening = false;
let _onResultCb: ((text: string, isFinal: boolean) => void) | null = null;
let _onStateCb: ((listening: boolean) => void) | null = null;
let _onErrorCb: ((error: string) => void) | null = null;

export function isVoiceInputSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function startListening(
  onResult: (text: string, isFinal: boolean) => void,
  onStateChange?: (listening: boolean) => void,
  onError?: (error: string) => void,
  lang = "en-US",
): void {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    onError?.("not-supported");
    return;
  }

  // Stop any existing session
  stopListening();

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  _onResultCb = onResult;
  _onStateCb = onStateChange ?? null;
  _onErrorCb = onError ?? null;

  recognition.onstart = () => {
    _listening = true;
    _onStateCb?.(true);
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    if (final) {
      _onResultCb?.(final.trim(), true);
    } else if (interim) {
      _onResultCb?.(interim.trim(), false);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    _onErrorCb?.(event.error);
  };

  recognition.onend = () => {
    _listening = false;
    _onStateCb?.(false);
  };

  _recognition = recognition;

  try {
    recognition.start();
  } catch {
    // start() can throw if already started or quickly stopped
    _onErrorCb?.("start-failed");
  }
}

export function stopListening(): void {
  if (_recognition) {
    try {
      _recognition.stop();
    } catch {
      // ignore
    }
    _recognition = null;
  }
  if (_listening) {
    _listening = false;
    _onStateCb?.(false);
  }
}

export function isListening(): boolean {
  return _listening;
}

/**
 * Map the app's i18n locale to a BCP-47 language tag for SpeechRecognition.
 * Examples: "en" → "en-US", "id" → "id-ID"
 */
export function localeToSpeechLang(locale: string): string {
  const map: Record<string, string> = {
    en: "en-US",
    id: "id-ID",
    es: "es-ES",
    pt: "pt-BR",
    ja: "ja-JP",
    zh: "zh-CN",
  };
  const base = locale.split("-")[0];
  return map[base] ?? "en-US";
}
