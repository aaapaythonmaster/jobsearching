import { z } from 'zod'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { env } from '@/config/env'
import { AppError } from '@/utils/http-error'

export interface GenerateTextInput {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
}

const ChatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
})

if (env.AI_PROXY_URL) {
  setGlobalDispatcher(new ProxyAgent(env.AI_PROXY_URL))
}

export async function generateText(input: GenerateTextInput): Promise<string> {
  if (!env.AI_API_KEY) {
    throw new AppError('AI_API_KEY is not configured', 500, 50010)
  }

  let response: Response
  try {
    response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages: input.messages,
        temperature: input.temperature ?? 0.3,
      }),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown network error'
    throw new AppError(`${env.AI_PROVIDER} request failed before response: ${detail}`, 502, 50210)
  }

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    const message = extractProviderError(payload) ?? `${env.AI_PROVIDER} request failed: ${response.status}`
    throw new AppError(message, 502, 50210)
  }

  const parsed = ChatCompletionResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new AppError(`${env.AI_PROVIDER} returned an invalid response`, 502, 50211)
  }
  return parsed.data.choices[0].message.content.trim()
}

function extractProviderError(payload: unknown): string | null {
  const parsed = z
    .object({
      error: z
        .object({
          message: z.string().optional(),
        })
        .optional(),
    })
    .safeParse(payload)
  return parsed.success ? parsed.data.error?.message ?? null : null
}
