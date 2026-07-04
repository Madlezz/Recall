import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isVoiceInputSupported,
  localeToSpeechLang,
  startListening,
  stopListening,
} from "@/services/voice-input";

/**
 * React hook for voice-to-text input in card editors.
 *
 * Usage:
 *   const frontRef = useRef("");
 *   const { listening, supported, toggle } = useVoiceInput(frontRef, setFront);
 *
 * - `toggle()` starts/stops listening
 * - Recognized text is appended to the ref's current value
 * - Interim results are shown live (appended as they come, replaced on final)
 * - Language is auto-detected from the app's i18n locale
 * - The ref is kept in sync by the caller's onChange handler
 *
 * Using a ref (not a getter closure) avoids stale-closure issues in the
 * SpeechRecognition callbacks, which fire asynchronously long after render.
 */
export function useVoiceInput(
  valueRef: React.RefObject<string>,
  setter: (value: string) => void,
) {
  const { i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const interimRef = useRef<string>("");
  const supported = isVoiceInputSupported();

  const handleResult = useCallback(
    (text: string, isFinal: boolean) => {
      const current = valueRef.current ?? "";
      // Remove previous interim text before appending new text
      const withoutInterim = interimRef.current
        ? current.slice(0, current.length - interimRef.current.length)
        : current;
      const needsSpace =
        withoutInterim.length > 0 &&
        !withoutInterim.endsWith(" ") &&
        !text.startsWith(" ");
      const newText = withoutInterim + (needsSpace ? " " : "") + text;
      setter(newText);
      interimRef.current = isFinal ? "" : text;
    },
    [valueRef, setter],
  );

  const toggle = useCallback(() => {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }

    setError(null);
    interimRef.current = "";

    startListening(
      handleResult,
      (isListening) => setListening(isListening),
      (err) => {
        setError(err);
        setListening(false);
      },
      localeToSpeechLang(i18n.language),
    );
  }, [listening, handleResult, i18n.language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopListening();
  }, []);

  return { listening, supported, error, toggle };
}
