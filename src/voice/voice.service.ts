import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import OpenAI from 'openai';
import { KnowledgeitemService } from 'src/knowledgeitem/knowledgeitem.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class VoiceService {
  private client: OpenAI;
  constructor(
    private readonly configService: ConfigService,
    private readonly knowledgeitemService: KnowledgeitemService,
    private readonly userService: UserService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async transcribeAudio(user_id: string, filePath: string) {
    const user = await this.userService.findById(user_id);
    if (!user) {
      throw new Error('User not found');
    }
    const stream = createReadStream(filePath);
    const transcription = await this.client.audio.transcriptions.create({
      file: stream,
      model: 'whisper-1',
    });
    const classifiedAudio = await this.classifyAudio(transcription.text);
    if (!classifiedAudio.isQuestion) {
      const createKnowledeItemDto = {
        ...classifiedAudio,
        user: user,
      };
      const createdKnowledgeItem = await this.knowledgeitemService.createKnowledgeItem(createKnowledeItemDto);
      if (!createdKnowledgeItem) {
        throw new Error('Failed to create knowledge item');
      }
      return { transcription: transcription.text, message: 'Knowledge item created successfully' };
    } else {
      const searchResult = await this.knowledgeitemService.searchKnowledgeItem({
        user: user,
        subject: classifiedAudio.subject,
      });
      return { transcription: transcription.text, searchResult: searchResult || 'No relevant information found' };
    }
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
6. isQuestion: true if the text is a question; false if it is a statement or command.
5. dueDate: 
   - If type = "reminder" — compute the exact date/time in ISO 8601 using dateContext.
   - If type = "fact" — always null.
All fields must be in a language which the input text is in.
JSON REQUIREMENTS:
- Return **only JSON**, no extra explanations or text.
- All fields must be present; use null if data is missing.
- Example JSON:

{
  "type": "reminder",
  "content": "Go to the store to buy milk",
  "subject": "store",
  "location": "kitchen",
  "isQuestion": false,
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
