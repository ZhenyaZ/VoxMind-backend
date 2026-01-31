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
      const embedding = await this.getEmbedding(classifiedAudio.content);
      const createKnowledeItemDto = {
        ...classifiedAudio,
        embedding,
        user: user,
      };
      const createdKnowledgeItem = await this.knowledgeitemService.createKnowledgeItem(createKnowledeItemDto);
      if (!createdKnowledgeItem) {
        throw new Error('Failed to create knowledge item');
      }
      return { transcription: transcription.text, message: 'Knowledge item created successfully' };
    } else {
      const queryVector = await this.getEmbedding(transcription.text);
      const searchResult = await this.knowledgeitemService.semanticSearch(user, queryVector);
      return { transcription: transcription.text, searchResult };
    }
  }

  async classifyAudio(text: string): Promise<any> {
    const now = new Date();
    const dateContext = `Today: ${now.toISOString()} (weekday: ${now.toLocaleDateString('en-US', { weekday: 'long' })})`;

    const prompt = `
You are an expert Semantic Analyst. Your goal is to extract structured knowledge from the raw input text.

CURRENT TIME CONTEXT: "${dateContext}"
Use this context to resolve relative dates like "tomorrow", "next Friday", "in 2 hours".

STRICT OUTPUT FORMAT (JSON ONLY):
Return a single JSON object with no markdown formatting (no \`\`\`json).

FIELDS SPECIFICATION:
1. type: "reminder" (if action required) OR "fact" (if informational/memory).
2. subject: The main topic (noun phrase, 1-3 lowercase words, e.g., "house keys", "meeting", "grocery").
3. location: Specific place mentioned (e.g., "kitchen drawer", "office"). Null if not present.
4. content: The original input text, cleaned up (capitalized first letter).
5. isQuestion: boolean.
6. dueDate: ISO 8601 string (e.g., "2024-02-20T14:00:00.000Z") if type is "reminder". If type is "fact", MUST be null.
7. tags: Array of 1-3 strings (lowercase keywords for filtering, e.g., ["work", "urgent"]).

RULES:
- If the text is in Russian, all extracted fields (subject, tags, location) must be in Russian.
- Keep "dueDate" in UTC.

INPUT TEXT: "${text}"
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
    console.log(JSON.parse(content));
    return JSON.parse(content);
  }

  async getEmbedding(text: string) {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
