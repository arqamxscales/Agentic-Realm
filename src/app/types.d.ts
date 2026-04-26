declare global {
  interface SpeechRecognitionEvent {
    results: Array<{
      0: {
        transcript: string;
      };
    }>;
  }

  interface SpeechRecognition {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  }

  type SpeechRecognitionConstructor = new () => SpeechRecognition;

  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export {};
