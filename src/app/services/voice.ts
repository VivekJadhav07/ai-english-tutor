import { Injectable, NgZone } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any;

  constructor(private zone: NgZone) {
    const { webkitSpeechRecognition } = (window as any);
    this.recognition = new webkitSpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true; // IMPORTANT: This enables real-time display
  }

  listen(onResult: (text: string, isFinal: boolean) => void) {
    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // We use NgZone to make sure Angular sees the text changes immediately
      this.zone.run(() => {
        onResult(finalTranscript || interimTranscript, !!event.results[event.results.length - 1].isFinal);
      });
    };

    this.recognition.start();
  }

  stop() {
    this.recognition.stop();
  }

  speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''));
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Zira')) || null;
    window.speechSynthesis.speak(utterance);
  }
}