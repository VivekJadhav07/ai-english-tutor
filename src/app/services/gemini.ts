import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
   private apiKey = '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';
//  private apiKey = (window as any).env?.GROQ_API_KEY || '';
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  // 1. This array stores every word said in the conversation
  private chatHistory: any[] = [
    {
      role: 'system',
      content: `You are Sarah, a friendly English Coach. 
      - Keep replies under 2 sentences. 
      - Always end with a question.
      - If Vivek uses slang like 'bro', gently suggest a formal alternative.
      - Never use bolding (**) or hashtags (#).`
    }
  ];

  async getAiFeedback(userSpeech: string): Promise<string> {
    // 2. Add Vivek's new message to the memory
    this.chatHistory.push({ role: 'user', content: userSpeech });

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // Fast and high-limit
          messages: this.chatHistory, // 3. Send the WHOLE history
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const aiReply = data.choices[0].message.content;

      // 4. Add Sarah's reply to the memory so she remembers it next turn
      this.chatHistory.push({ role: 'assistant', content: aiReply });

      return aiReply;
    } catch (error) {
      console.error('Groq Error:', error);
      return "I'm having a small glitch, Vivek. Can you say that again?";
    }
  }

  // Clear memory if you want to start a fresh lesson
  resetChat() {
    this.chatHistory = [this.chatHistory[0]]; // Keep only the system rules
  }
}