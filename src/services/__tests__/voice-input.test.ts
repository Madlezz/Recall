import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isVoiceInputSupported,
  startListening,
  stopListening,
  isListening,
  localeToSpeechLang,
} from "../voice-input";

// Mock SpeechRecognition
class MockSpeechRecognition extends EventTarget {
  lang = "en-US";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  started = false;

  start() {
    this.started = true;
    this.dispatchEvent(new Event("start"));
  }

  stop() {
    this.started = false;
    this.dispatchEvent(new Event("end"));
  }

  abort() {
    this.started = false;
  }

  // Helper to simulate a recognition result
  simulateResult(transcript: string, isFinal: boolean) {
    const result = {
      isFinal,
      length: 1,
      0: { transcript, confidence: 0.9 },
    };
    const resultList = {
      length: 1,
      0: result,
    };
    const event = new Event("result") as any;
    event.results = resultList;
    event.resultIndex = 0;
    this.dispatchEvent(event);
  }

  simulateError(error: string) {
    const event = new Event("error") as any;
    event.error = error;
    event.message = "";
    this.dispatchEvent(event);
  }
}

describe("voice-input service", () => {
  let originalSpeechRecognition: any;
  let originalWebkit: any;

  beforeEach(() => {
    originalSpeechRecognition = (window as any).SpeechRecognition;
    originalWebkit = (window as any).webkitSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    (window as any).SpeechRecognition = undefined;
  });

  afterEach(() => {
    (window as any).SpeechRecognition = originalSpeechRecognition;
    (window as any).webkitSpeechRecognition = originalWebkit;
    stopListening();
  });

  describe("isVoiceInputSupported", () => {
    it("returns true when webkitSpeechRecognition is available", () => {
      expect(isVoiceInputSupported()).toBe(true);
    });

    it("returns false when neither SpeechRecognition nor webkitSpeechRecognition exist", () => {
      (window as any).webkitSpeechRecognition = undefined;
      (window as any).SpeechRecognition = undefined;
      expect(isVoiceInputSupported()).toBe(false);
    });

    it("returns true when SpeechRecognition (non-prefixed) is available", () => {
      (window as any).webkitSpeechRecognition = undefined;
      (window as any).SpeechRecognition = MockSpeechRecognition;
      expect(isVoiceInputSupported()).toBe(true);
    });
  });

  describe("localeToSpeechLang", () => {
    it("maps common locale prefixes to BCP-47 tags", () => {
      expect(localeToSpeechLang("en")).toBe("en-US");
      expect(localeToSpeechLang("en-US")).toBe("en-US");
      expect(localeToSpeechLang("id")).toBe("id-ID");
      expect(localeToSpeechLang("id-ID")).toBe("id-ID");
      expect(localeToSpeechLang("es")).toBe("es-ES");
      expect(localeToSpeechLang("pt")).toBe("pt-BR");
      expect(localeToSpeechLang("ja")).toBe("ja-JP");
      expect(localeToSpeechLang("zh")).toBe("zh-CN");
    });

    it("falls back to en-US for unknown locales", () => {
      expect(localeToSpeechLang("fr")).toBe("en-US");
      expect(localeToSpeechLang("xx-YY")).toBe("en-US");
    });
  });

  describe("startListening / stopListening", () => {
    it("calls onResult with final transcript", () => {
      const onResult = vi.fn();
      const recognition = new MockSpeechRecognition();

      // Patch the constructor to return our instance
      (window as any).webkitSpeechRecognition = function () {
        return recognition;
      };

      startListening(onResult, undefined, undefined, "en-US");
      recognition.simulateResult("hello world", true);

      expect(onResult).toHaveBeenCalledWith("hello world", true);
    });

    it("calls onResult with interim transcript", () => {
      const onResult = vi.fn();
      const recognition = new MockSpeechRecognition();
      (window as any).webkitSpeechRecognition = function () {
        return recognition;
      };

      startListening(onResult, undefined, undefined, "en-US");
      recognition.simulateResult("hello", false);

      expect(onResult).toHaveBeenCalledWith("hello", false);
    });

    it("calls onStateChange when listening starts and stops", () => {
      const onState = vi.fn();
      const recognition = new MockSpeechRecognition();
      (window as any).webkitSpeechRecognition = function () {
        return recognition;
      };

      startListening(vi.fn(), onState, undefined, "en-US");
      expect(onState).toHaveBeenCalledWith(true);
      expect(isListening()).toBe(true);

      recognition.stop();
      expect(onState).toHaveBeenCalledWith(false);
      expect(isListening()).toBe(false);
    });

    it("calls onError when recognition errors", () => {
      const onError = vi.fn();
      const recognition = new MockSpeechRecognition();
      (window as any).webkitSpeechRecognition = function () {
        return recognition;
      };

      startListening(vi.fn(), undefined, onError, "en-US");
      recognition.simulateError("network");

      expect(onError).toHaveBeenCalledWith("network");
    });

    it("calls onError with not-supported when no SpeechRecognition", () => {
      (window as any).webkitSpeechRecognition = undefined;
      (window as any).SpeechRecognition = undefined;

      const onError = vi.fn();
      startListening(vi.fn(), undefined, onError, "en-US");

      expect(onError).toHaveBeenCalledWith("not-supported");
    });

    it("stopListening stops the current recognition session", () => {
      const onState = vi.fn();
      const recognition = new MockSpeechRecognition();
      (window as any).webkitSpeechRecognition = function () {
        return recognition;
      };

      startListening(vi.fn(), onState, undefined, "en-US");
      expect(isListening()).toBe(true);

      stopListening();
      expect(isListening()).toBe(false);
    });
  });
});
