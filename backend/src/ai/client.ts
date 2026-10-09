import OpenAI from 'openai';
import { z } from 'zod';

let client: OpenAI | null = null;

export function openai() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set on the server');
  client ??= new OpenAI({ apiKey: key, timeout: 90_000, maxRetries: 2 });
  return client;
}

/** Research, ideas, kits and coaching. */
export function model() {
  return process.env.OPENAI_LAUNCH_MODEL || 'gpt-5.4-mini';
}

/** Short, low-stakes text such as customer replies. */
export function fastModel() {
  return process.env.OPENAI_FAST_MODEL || 'gpt-5.4-nano';
}

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
};

function logUsage(task: string, modelName: string, startedAt: number, usage?: Usage | null, extra = '') {
  const u = usage ?? {};
  console.log(
    `[ai] ${task} model=${modelName} ms=${Date.now() - startedAt}` +
      ` in=${u.input_tokens ?? u.prompt_tokens ?? 0}` +
      ` cached=${u.input_tokens_details?.cached_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0}` +
      ` out=${u.output_tokens ?? u.completion_tokens ?? 0}` +
      ` reasoning=${u.output_tokens_details?.reasoning_tokens ?? u.completion_tokens_details?.reasoning_tokens ?? 0}` +
      (extra ? ` ${extra}` : ''),
  );
}

export type SearchLocation = { country?: string; city?: string; region?: string };

/**
 * Web-search research pass. Returns plain-text notes with sources, or null if search is unavailable.
 * Without `user_location` OpenAI localizes search to the United States, so always pass one.
 */
export async function research(
  instructions: string,
  input: string,
  opts: { location?: SearchLocation; maxSearches?: number } = {},
): Promise<string | null> {
  const userLocation = { type: 'approximate' as const, ...opts.location };
  for (const tool of ['web_search', 'web_search_preview'] as const) {
    const started = Date.now();
    try {
      const response = await openai().responses.create({
        model: model(),
        tools: [{ type: tool, user_location: userLocation, search_context_size: 'medium' }],
        instructions,
        input,
        prompt_cache_key: 'kisa-research',
        ...({ max_tool_calls: opts.maxSearches ?? 5 } as object),
      });
      const searches = response.output.filter((o) => o.type === 'web_search_call').length;
      logUsage('research', model(), started, response.usage, `searches=${searches}`);
      if (response.output_text) return response.output_text;
    } catch (err) {
      console.warn(`Research with ${tool} failed`, (err as Error).message);
    }
  }
  return null;
}

type ComposeOpts = { task: string; model?: string };

function extractJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI returned no JSON');
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * JSON pass validated against a zod schema. Keep `system` static per task so OpenAI's prompt
 * cache can reuse it; put everything user-specific in `user`. Retries once with the error.
 */
export async function composeJson<T extends z.ZodTypeAny>(
  schema: T,
  system: string,
  user: string,
  opts: ComposeOpts,
): Promise<z.infer<T>> {
  const modelName = opts.model ?? model();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    const completion = await openai().chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' },
      messages,
      prompt_cache_key: `kisa-${opts.task}`,
    });
    logUsage(opts.task, modelName, started, completion.usage, attempt ? `retry=${attempt}` : '');
    const text = completion.choices[0]?.message?.content || '';
    try {
      return schema.parse(extractJson(text));
    } catch (err) {
      if (attempt >= 1) throw err;
      messages.push(
        { role: 'assistant', content: text },
        {
          role: 'user',
          content: `That JSON was invalid (${(err as Error).message.slice(0, 400)}). Return the corrected JSON only.`,
        },
      );
    }
  }
}

export async function composeText(system: string, user: string, opts: ComposeOpts): Promise<string> {
  const modelName = opts.model ?? model();
  const started = Date.now();
  const completion = await openai().chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    prompt_cache_key: `kisa-${opts.task}`,
  });
  logUsage(opts.task, modelName, started, completion.usage);
  return completion.choices[0]?.message?.content?.trim() || '';
}

/** Links that are never a useful place to post or buy (help centers, login walls, search engines). */
const USELESS_URL = /\/(help|support|login|signin|policies|terms)(\/|$|\?)|^https?:\/\/(www\.)?(google|bing)\.[a-z.]+\/search/i;

function cleanUrl(value: string) {
  try {
    const parsed = new URL(value);
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export const optStr = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => v || undefined);

export const optUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v && /^https?:\/\//.test(v) && !USELESS_URL.test(v) ? cleanUrl(v) : undefined));

export const strList = z
  .array(z.string().trim())
  .optional()
  .nullable()
  .transform((v) => (v ?? []).filter((s) => s.length > 0));
