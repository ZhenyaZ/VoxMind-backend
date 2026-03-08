import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import OpenAI, { toFile } from 'openai';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';
import { KnowledgeitemService } from 'src/knowledgeitem/knowledgeitem.service';
import { ReminderProducerService } from 'src/reminder/producer/reminder-producer/reminder-producer.service';
import { UserService } from 'src/user/user.service';

export const TAGS = [
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
] as const;
export type Tag = (typeof TAGS)[number];
interface ClassifiedResponse {
  type: 'reminder' | 'fact';
  subject: string;
  content: string;
  isQuestion: boolean;
  tags: Tag[];
  dueDate?: Date;
  location?: string;
}

@Injectable()
export class NLPService {
  private client: OpenAI;
  constructor(
    @InjectRepository(KnowledgeItem) private readonly knowledgeItemRepository: EntityRepository<KnowledgeItem>,
    @InjectRepository(ScheduledTasks) private readonly scheduledTasksRepository: EntityRepository<ScheduledTasks>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => KnowledgeitemService))
    private readonly knowledgeitemService: KnowledgeitemService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ReminderProducerService))
    private readonly reminderProducerService: ReminderProducerService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }
  async processText(user_id: string, content: string) {
    try {
      const user = await this.userService.findById(user_id);
      if (!user) throw new NotFoundException('User not found');
      const userTimezone = await this.userService.getUserTimezone(user_id);
      let scheduledTaskId;
      const classified = await this.classifyAudio(content, user_id);
      const rawTags = classified.tags;
      const validatedTags: Tag[] = Array.isArray(rawTags)
        ? rawTags.filter((tag): tag is Tag => TAGS.includes(tag as Tag))
        : [];
      if (!classified.isQuestion) {
        if (classified.dueDate) {
          const targetDate = DateTime.fromJSDate(new Date(classified.dueDate), { zone: userTimezone }).toUTC();
          const delay = targetDate.toMillis() - Date.now();
          const scheduledMessage = await this.remindMessage(classified.content);
          const scheduledTask = await this.reminderProducerService.createScheduleRemind(
            user.id,
            `${scheduledMessage}`,
            delay,
          );
          scheduledTaskId = scheduledTask.task.id;
        }
        const embedding = await this.getEmbedding(classified.content);
        const createKnowledgeItemPayload = {
          ...classified,
          tags: validatedTags,
          embedding,
          user: user,
        };
        const createdKnowledgeItem = await this.knowledgeitemService.createKnowledgeItem(createKnowledgeItemPayload);
        if (scheduledTaskId)
          await this.scheduledTasksRepository.nativeUpdate({ id: scheduledTaskId }, { knowledgeItem: createdKnowledgeItem });
        if (!createdKnowledgeItem) {
          throw new Error('Failed to create knowledge item');
        }
        return {
          transcription: classified.content,
          answer: "Everything is saved. Is there anything else you'd like me to remember?",
        };
      } else {
        const queryVector = await this.getEmbedding(classified.content);
        const searchResult = await this.knowledgeitemService.semanticSearch(user, queryVector);
        const b = await this.generateAnswer(classified.content, searchResult);
        return { answer: b, transcription: classified.content };
      }
    } catch (error) {
      console.error('Error while processing text: ', error);
      throw new InternalServerErrorException('Something happen wrong. Sorry');
    }
  }

  async transcribeAudio(user_id: string, file: Express.Multer.File) {
    try {
      const user = await this.userService.findById(user_id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const userTimezone = await this.userService.getUserTimezone(user_id);
      let scheduledTaskId;
      const transcription = await this.client.audio.transcriptions.create({
        file: await toFile(file.buffer, 'audio.m4a'),
        model: 'gpt-4o-mini-transcribe',
      });
      const classifiedAudio = await this.classifyAudio(transcription.text, user_id);
      const rawTags = classifiedAudio.tags;
      const validatedTags: Tag[] = Array.isArray(rawTags)
        ? rawTags.filter((tag): tag is Tag => TAGS.includes(tag as Tag))
        : [];
      if (!classifiedAudio.isQuestion) {
        if (classifiedAudio.dueDate) {
          const targetDate = DateTime.fromJSDate(new Date(classifiedAudio.dueDate), { zone: userTimezone }).toUTC();
          const delay = targetDate.toMillis() - Date.now();
          const scheduledMessage = await this.remindMessage(classifiedAudio.content);
          const scheduledTask = await this.reminderProducerService.createScheduleRemind(
            user.id,
            `${scheduledMessage}`,
            delay,
          );
          scheduledTaskId = scheduledTask.task.id;
        }
        const embedding = await this.getEmbedding(classifiedAudio.content);
        const createKnowledgeItemPayload = {
          ...classifiedAudio,
          tags: validatedTags,
          embedding,
          user: user,
        };
        const createdKnowledgeItem = await this.knowledgeitemService.createKnowledgeItem(createKnowledgeItemPayload);
        if (scheduledTaskId)
          await this.scheduledTasksRepository.nativeUpdate({ id: scheduledTaskId }, { knowledgeItem: createdKnowledgeItem });
        if (!createdKnowledgeItem) {
          throw new Error('Failed to create knowledge item');
        }
        return {
          transcription: transcription.text,
          answer: "Everything is saved. Is there anything else you'd like me to remember?",
        };
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

  async classifyAudio(text: string, id: string): Promise<ClassifiedResponse> {
    const now = new Date();
    const userTimezone = (await this.userService.getUserTimezone(id)) || 'UTC';
    const localTimeStr = now.toLocaleString('en-US', {
      timeZone: userTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateContext = `
      User Timezone: ${userTimezone}
      User Local Time: ${localTimeStr}
      Reference UTC Time: ${now.toISOString()}
    `;

    const prompt = `
You are an expert Multilingual Semantic Analyst for VoxMind.
Your goal is to parse raw user speech into a strict JSON format, respecting the input language.

=== CURRENT TIME CONTEXT ===
Reference Context: "${dateContext}"
(CRITICAL: The user is in ${userTimezone}. Use "User Local Time" as the anchor for relative terms like "today", "tomorrow", or "at 9 PM").

=== LANGUAGE & GRAMMAR RULES ===
1. **Auto-Detect Language:** Identify the dominant language of the INPUT TEXT.
2. **Output Language:** "subject", "location", and "content" MUST remain in the Detected Language.
3. **Subject Normalization:** Extract the main topic in DICTIONARY FORM (Nominative/Singular).

=== CLASSIFICATION LOGIC ===
1. **isQuestion:** TRUE for info requests. FALSE for commands/facts.
2. **Type:** "reminder" (future action) OR "fact" (stored info).

=== TIME & DUE DATE LOGIC ===
1. **Natural Language Parsing:** Convert written numbers ("девять") to digits (9).
2. **AM/PM & Local Context:** - "9 PM" or "9 вечера" refers to 21:00 in the **User Local Time**.
   - Calculate the absolute UTC time based on this local reference.
3. **Relative Scheduling:**
   - If a specific time is mentioned (e.g., "в 9 вечера"): Calculate the nearest future ISO UTC string. 
   - If that time has already passed today in the user's timezone, schedule for tomorrow.
   - If NO time is mentioned for a "reminder": Set to +1 HOUR from current UTC.
4. **Output Format:** Return a strict ISO 8601 string (UTC) with 'Z' suffix (e.g., 2026-03-01T20:00:00.000Z).

=== FIELDS SPECIFICATION (Strict JSON) ===
1. type: "reminder" | "fact"
2. subject: The core topic in the INPUT LANGUAGE (Dictionary form).
3. location: Place or null.
4. content: Original text, cleaned.
5. isQuestion: boolean.
6. dueDate: ISO 8601 string (UTC) or null.
7. tags: [${TAGS.join(', ')}] (English only).

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
    return JSON.parse(content);
  }

  async getEmbedding(text: string) {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async remindMessage(message: string) {
    const prompt = `You are the VoxMind Reminder Optimization Engine. Your sole task is to refactor informal user input into a professional, actionable, and structured reminder.

=== CORE OBJECTIVE ===
Normalize conversational requests into a standard format: [Action/Verb] + [Object/Context] + [Time/Condition].

=== STRICT OPERATIONAL RULES ===
1. Structural Standard
   - Start with an imperative or infinitive verb (e.g., "Call", "Buy", "Schedule").
   - Ensure the "What" (Action) precedes the "When" (Time).
   - Example: "I need to remember to buy bread tomorrow" → Buy bread tomorrow.

2. Temporal Precision
   - Preserve relative time expressions (e.g., "in 2 hours", "next Friday").
   - DO NOT calculate or invent specific calendar dates (e.g., do not turn "tomorrow" into "February 20th").
   - Normalize time formats: "8 PM" or "8 вечера" → 20:00.

3. Noise Reduction
   - Strip all conversational fillers: "hey", "please", "listen", "don't forget", "remind me to".
   - Remove redundant punctuation and emojis.

4. Grammar & Language Consistency
   - Output ONLY in the language used by the user. 
   - Fix typos and improve syntax while maintaining the original intent.
   - Use a bulleted list ONLY if the input contains multiple distinct tasks.

5. Handling Ambiguity
   - If the input is a noun without a verb (e.g., "Dentist at 5"), add a logical action: "Attend dentist appointment at 17:00".

=== EXAMPLES ===
Input: "Remind me in two days to go to the grocery store"
Output: Go to the grocery store in two days.

Input: "Напомни завтра в 8 вечера выпить таблетки"
Output: Выпить таблетки завтра в 20:00.

Input: "Don't forget to call Mom and pick up the dry cleaning"
Output: 
- Call Mom.
- Pick up dry cleaning.

=== OUTPUT FORMAT ===
Return ONLY the optimized reminder text. No headers, no quotes, no explanations.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `USER REMIND: "${message}"`,
        },
      ],
      temperature: 0.3,
    });
    return response.choices[0].message.content;
  }
}
