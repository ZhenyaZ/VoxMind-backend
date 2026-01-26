import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import OpenAI from 'openai';

@Injectable()
export class VoiceService {
  private client: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async transcribeAudio(filePath: string): Promise<{ transcription: string; classification: string }> {
    const stream = createReadStream(filePath);
    const transcription = await this.client.audio.transcriptions.create({
      file: stream,
      model: 'whisper-1',
    });
    const res = await this.classifyAudio(transcription.text);
    return {
      transcription: transcription.text,
      classification: res,
    };
  }
  async classifyAudio(text: string): Promise<any> {
    const now = new Date();
    const dateContext = `Today: ${now.toISOString()} (weekday: ${now.toLocaleDateString('en-US', { weekday: 'long' })})`;

    const prompt = `
You are a data analyst. Your task is to transform the input text into a strictly structured JSON object of type KnowledgeItem.

TIME CONTEXT:
${dateContext}  // Use this context to compute reminder due dates.

JSON FORMATTING RULES:
1. type: 
   - "reminder" — if the text describes an action that must be done.
   - "fact" — if the text contains information about a location or event.
2. subject: one lowercase word representing the main topic (e.g., "keys", "home", "work").
3. location: a specific place mentioned in the text (e.g., "cabinet", "kitchen", "car"). Fill this if present.
4. content: the full original text, unmodified.
5. dueDate: 
   - If type = "reminder" — compute the exact date/time in ISO 8601 using dateContext.
   - If type = "fact" — always null.

JSON REQUIREMENTS:
- Return **only JSON**, no extra explanations or text.
- All fields must be present; use null if data is missing.
- Example JSON:

{
  "id": "uuid",
  "type": "reminder",
  "content": "Go to the store to buy milk",
  "subject": "store",
  "location": "kitchen",
  "dueDate": "2026-01-26T12:00:00.000Z",
  "createdAt": "2026-01-26T21:00:00.000Z"
}

TEXT TO ANALYZE: "${text}"
`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return only the clean JSON object.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = response.choices[0].message?.content || '{}';
    return JSON.parse(content);
  }
}
