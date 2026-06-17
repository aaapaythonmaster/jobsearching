import { z } from 'zod'
import { env } from '@/config/env'
import { AppError } from '@/utils/http-error'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateTextInput {
  messages: ChatMessage[]
  temperature?: number
}

const DeepSeekChatResponseSchema = z.object({
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

export async function generateText(input: GenerateTextInput): Promise<string> {
  if (!env.AI_API_KEY) {
    throw new AppError('AI_API_KEY is not configured', 500, 50010)
  }

  const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
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

  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    const message = extractProviderError(payload) ?? `DeepSeek request failed: ${response.status}`
    throw new AppError(message, 502, 50210)
  }

  const parsed = DeepSeekChatResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new AppError('DeepSeek returned an invalid response', 502, 50211)
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
