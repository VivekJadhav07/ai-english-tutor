import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from './services/voice';
import { GeminiService } from './services/gemini';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-container">
      <div class="header">
        <h1>English Coach</h1>
        <div class="mode-badge" [class.voice-off]="!isVoiceEnabled">
          {{ isVoiceEnabled ? '🔊 Voice Mode' : '💬 Text-Only Mode' }}
        </div>
      </div>

      <div class="scroll-area" #scrollMe>
        <div *ngFor="let chat of history" [ngClass]="{'user-row': chat.role === 'user', 'ai-row': chat.role === 'ai'}">
          <div class="bubble" [class.error-bubble]="chat.isError">
            {{ chat.text }}
          </div>
        </div>
        
        <div class="user-row" *ngIf="status === 'Listening' && userText">
          <div class="bubble interim">{{ userText }}</div>
        </div>
      </div>

      <div class="input-area">
        <div class="visualizer" [class.active]="status === 'Listening'" [class.thinking]="status === 'Processing'"></div>
        
        <button (click)="togglePractice()" [class.stop]="isTalking">
          {{ isTalking ? 'Stop Session' : 'Start Talking' }}
        </button>
        
        <p class="status-hint">{{ statusMessage }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host { --primary: #38bdf8; --bg: #0f172a; --ai-bubble: #1e293b; }
    .chat-container { height: 100vh; display: flex; flex-direction: column; background: var(--bg); color: white; font-family: 'Inter', sans-serif; }
    .header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
    .header h1 { font-size: 1.2rem; margin: 0; }
    .mode-badge { font-size: 12px; padding: 4px 10px; border-radius: 20px; background: #059669; }
    .mode-badge.voice-off { background: #64748b; }
    .scroll-area { flex-grow: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
    .bubble { max-width: 80%; padding: 12px 18px; border-radius: 20px; font-size: 16px; line-height: 1.4; animation: pop 0.2s ease-out; }
    @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .user-row { align-self: flex-end; }
    .user-row .bubble { background: var(--primary); color: #0f172a; border-bottom-right-radius: 4px; }
    .ai-row { align-self: flex-start; }
    .ai-row .bubble { background: var(--ai-bubble); border: 1px solid #334155; border-bottom-left-radius: 4px; }
    .error-bubble { border: 1px solid #ef4444 !important; color: #f87171; }
    .interim { opacity: 0.6; font-style: italic; }
    .input-area { padding: 30px; background: #1e293b; display: flex; flex-direction: column; align-items: center; gap: 10px; border-top: 1px solid #334155; }
    .visualizer { width: 50px; height: 50px; border-radius: 50%; background: var(--primary); transition: 0.3s; opacity: 0; }
    .visualizer.active { opacity: 1; animation: pulse 1s infinite; }
    .visualizer.thinking { opacity: 1; background: #fbbf24; animation: rotate 2s infinite linear; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(56, 189, 248, 0); } 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); } }
    button { padding: 15px 50px; border-radius: 30px; border: none; background: var(--primary); font-weight: bold; cursor: pointer; font-size: 1rem; }
    button.stop { background: #ef4444; color: white; }
    .status-hint { font-size: 12px; color: #94a3b8; }
  `]
})
export class App {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  status: 'Idle' | 'Listening' | 'Processing' | 'Speaking' = 'Idle';
  statusMessage = "Ready to practice?";
  userText = "";
  history: {role: 'user' | 'ai', text: string, isError?: boolean}[] = [];
  isTalking = false;
  isVoiceEnabled = true;
  private speechTimeout: any; // 🛡️ Buffer for mobile stability

  constructor(private voice: VoiceService, private gemini: GeminiService) {}

  togglePractice() {
    this.isTalking = !this.isTalking;
    if (this.isTalking) {
      this.runPracticeLoop();
    } else {
      this.status = 'Idle';
      this.statusMessage = "Practice stopped.";
      this.voice.stop();
      window.speechSynthesis.cancel();
      clearTimeout(this.speechTimeout);
    }
  }

  async runPracticeLoop() {
    this.status = 'Listening';
    this.statusMessage = "I'm listening...";

    this.voice.listen(async (text, isFinal) => {
      this.userText = text;

      // 🛡️ MOBILE FIX: Wait for 800ms of silence before processing
      if (isFinal && this.isTalking) {
        clearTimeout(this.speechTimeout);
        this.speechTimeout = setTimeout(async () => {
          this.voice.stop(); 
          this.status = 'Processing';
          this.statusMessage = "Thinking...";

          this.history.push({ role: 'user', text: text });
          this.userText = "";
          this.scrollToBottom();

          try {
            const reply = await this.gemini.getAiFeedback(text);
            this.history.push({ role: 'ai', text: reply });
            this.scrollToBottom();

            if (this.isVoiceEnabled) {
              this.status = 'Speaking';
              this.statusMessage = "Sarah is speaking...";
              await this.speakAndWait(reply);
            }

            if (this.isTalking) {
              this.runPracticeLoop();
            }
          } catch (err: any) {
            this.handleApiError(err);
          }
        }, 800); // 800ms "patient" buffer
      }
    });
  }

  private handleApiError(err: any) {
    if (err.message?.includes('429')) {
      this.isVoiceEnabled = false;
      this.history.push({ 
        role: 'ai', 
        text: "Voice limit reached! Switching to Text-Only mode.",
        isError: true 
      });
      this.scrollToBottom();
      if (this.isTalking) this.runPracticeLoop();
    } else {
      this.statusMessage = "Connection error. Re-trying...";
      setTimeout(() => { if (this.isTalking) this.runPracticeLoop(); }, 3000);
    }
  }

  private speakAndWait(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.voice.speak(text);
      const interval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(interval);
          resolve();
        }
      }, 300);
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      } catch (err) {}
    }, 100);
  }
}