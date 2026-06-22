/**
 * TTS service using Web Speech API (fully offline, no cloud dependency).
 * Falls back gracefully if the browser doesn't support speech synthesis.
 */

let _currentUtterance: SpeechSynthesisUtterance | null = null;
let _speakingCallback: ((speaking: boolean) => void) | null = null;

export function setSpeakingCallback(cb: (speaking: boolean) => void): void {
  _speakingCallback = cb;
}

export function speakText(text: string, lang = "en-US", rate = 1.0): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  // Strip markdown formatting for cleaner speech
  const cleanText = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\$\$(.*?)\$\$/g, "")
    .replace(/\$(.*?)\$/g, "")
    .replace(/\n+/g, ". ");

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1;

  // Try to find a voice matching the language
  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  utterance.onstart = () => _speakingCallback?.(true);
  utterance.onend = () => _speakingCallback?.(false);
  utterance.onerror = () => _speakingCallback?.(false);

  _currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    _currentUtterance = null;
    _speakingCallback?.(false);
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}