import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { KnowledgeitemService } from 'src/knowledgeitem/knowledgeitem.service';
import { UserService } from 'src/user/user.service';

const TAGS = [
  'note',
  'idea',
  'task',
  'reminder',
  'insight',
  'fact',
  'definition',
  'work',
  'personal',
  'study',
  'health',
  'finance',
  'home',
  'travel',
  'project',
  'meeting',
  'shopping',
  'research',
  'workout',
  'event',
  'tech',
  'urgent',
  'important',
  'later',
  'archive',
];

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

  async transcribeAudio(user_id: string, file: Express.Multer.File) {
    try {
      const user = await this.userService.findById(user_id);
      if (!user) {
        throw new Error('User not found');
      }
      const transcription = await this.client.audio.transcriptions.create({
        file: await toFile(file.buffer, 'audio.m4a'),
        model: 'gpt-4o-mini-transcribe',
      });
      const classifiedAudio = await this.classifyAudio(transcription.text);
      const rawTags = classifiedAudio.tags;
      const validatedTags = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [];
      if (!classifiedAudio.isQuestion) {
        const embedding = await this.getEmbedding(classifiedAudio.content);
        const createKnowledeItemDto = {
          ...classifiedAudio,
          tags: validatedTags,
          embedding,
          user: user,
        };
        const createdKnowledgeItem = await this.knowledgeitemService.createKnowledgeItem(createKnowledeItemDto);
        if (!createdKnowledgeItem) {
          throw new Error('Failed to create knowledge item');
        }
        return { transcription: transcription.text, answer: 'Knowledge created successfully' };
      } else {
        const queryVector = await this.getEmbedding(transcription.text);
        const searchResult = await this.knowledgeitemService.semanticSearch(user, queryVector);
        const b = await this.generateAnswer(transcription.text, searchResult);
        return { answer: b, transcription: transcription.text };
      }
    } catch (error) {
      console.error('Whisper Error:', error);
      throw error;
    }
  }

  async generateAnswer(transcription: string, searchResults: any[]) {
    const context = searchResults
      .map((res, i) => `Note ${i + 1} [Type: ${res.type}, Subject: ${res.subject}]: ${res.content}`)
      .join('\n');
    const prompt = `You are the VoxMind Intelligent Assistant.

Your task is to provide a clear, concise, and human-readable answer to the user's question using ONLY the information provided in their personal notes (Context).

=== CORE PRINCIPLES ===
You are precise, neutral, and helpful.
You never speculate, infer, or add external knowledge.
If the information is not explicitly present in the context, you say so clearly.

=== RULES ===

1. **Strict Source Integrity**
   - Use ONLY the information present in CONTEXT FROM NOTES.
   - Do NOT add assumptions, explanations, or inferred details.
   - If the context does not contain an answer, respond exactly with:
     > "I don't have any notes about that."

2. **Language Consistency**
   - Respond in the SAME language as the USER QUESTION.
   - If notes are written in multiple languages, translate and consolidate them into the user's language.
   - Do not mention that a translation occurred.

3. **De-duplication & Consolidation**
   - If multiple notes contain overlapping or similar information, merge them into a single, clean statement.
   - Avoid repetition.
   - Prefer the most specific and detailed version of the information.

4. **Temporal Awareness**
   - Correctly interpret time references such as:
     - "today", "tomorrow", "yesterday"
     - specific dates or weekdays
   - If notes explicitly mention dates or deadlines, align them with the user's question.
   - Do NOT guess dates if they are missing.

5. **Formatting & Clarity**
   - Be direct and factual.
   - Use bullet points for lists.
   - Use short sentences.
   - Avoid conversational filler such as:
     - "Based on your notes"
     - "It seems that"
     - "You might want to"
   - Do NOT include metadata, IDs, scores, distances, or technical details.

6. **Answer Confidence Control**
   - If the context partially answers the question, answer ONLY the part that is supported.
   - Do not fill gaps with guesses.
   - Never over-answer.

=== OUTPUT FORMAT ===
Provide ONLY the final answer text.
No preamble.
No explanation of reasoning.
No references to context or notes.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `CONTEXT:\n${context}\n\nUSER QUESTION: "${transcription}"`,
        },
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content;
  }

  async classifyAudio(text: string): Promise<any> {
    const now = new Date();
    const dateContext = `Today: ${now.toISOString()} (weekday: ${now.toLocaleDateString('en-US', { weekday: 'long' })})`;

    const prompt = `
You are an expert Multilingual Semantic Analyst for VoxMind.
Your goal is to parse raw user speech into a strict JSON format, respecting the input language.

=== CURRENT TIME CONTEXT ===
Reference Time: "${dateContext}"
(Use this to calculate absolute ISO dates for relative terms like "tomorrow", "next Friday", "mañana", "morgen").

=== LANGUAGE & GRAMMAR RULES ===
1. **Auto-Detect Language:** Identify the dominant language of the INPUT TEXT.
2. **Output Language:** The fields "subject", "location", and "content" MUST remain in the **Detected Language**.
3. **Subject Normalization:** - Extract the main topic as a noun phrase (1-3 words).
   - **CRITICAL:** Convert the subject to its **DICTIONARY FORM** (Nominative case / Singular) appropriate for the detected language.
     - Example (RU): "Купить огурцов" -> "огурец"
     - Example (EN): "Buy apples" -> "apple"
     - Example (ES): "Comprar manzanas" -> "manzana"
     - Example (DE): "Kaufe Äpfel" -> "Apfel"

=== CLASSIFICATION LOGIC ===
1. **isQuestion (Intent Detection):**
   - TRUE if the input asks for information (starts with interrogative words like "Who/Qui/Wer/Kto", "Where/Où/Wo/Gde" OR ends with "?").
   - FALSE if the input states a fact, a memory, or commands an action.

2. **Type Determination (if isQuestion is false):**
   - "reminder": Requires future action. Implies a verb like "buy", "call", "go", "faire", "kaufen", "делать".
   - "fact": Static knowledge, codes, location of items.

=== FIELDS SPECIFICATION (Strict JSON) ===
1. type: "reminder" OR "fact".
2. subject: The core topic in the INPUT LANGUAGE (Dictionary form).
3. location: Specific place mentioned (e.g., "kitchen", "küche", "cocina"). Null if missing.
4. content: The original input text, cleaned and capitalized.
5. isQuestion: boolean.
6. dueDate: ISO 8601 string (UTC) if a time context exists. Null otherwise.
7. tags: Select 1-3 tags **STRICTLY** from this list: [${TAGS.join(', ')}].
   - **IMPORTANT:** Even if the input is in Russian/German/Spanish, **keep the tags in ENGLISH** exactly as listed above.

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
