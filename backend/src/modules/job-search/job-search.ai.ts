import { z } from 'zod'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { env } from '@/config/env'
import { AppError } from '@/utils/http-error'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<TextContentPart | ImageContentPart>
}

export interface GenerateTextInput {
  messages: ChatMessage[]
  model?: string
  temperature?: number
}

export interface TextContentPart {
  type: 'text'
  text: string
}

export interface ImageContentPart {
  type: 'image_url'
  image_url: {
    url: string
  }
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

const LayoutParsingResponseSchema = z.object({
  md_results: z.string(),
})

if (env.AI_PROXY_URL) {
  setGlobalDispatcher(new ProxyAgent(env.AI_PROXY_URL))
}

export async function generateText(input: GenerateTextInput): Promise<string> {
  if (!env.AI_API_KEY) {
    throw new AppError('AI_API_KEY is not configured', 500, 50010)
  }

  const response = await requestChatCompletion(input)

  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    const message = extractProviderError(payload) ?? `${env.AI_PROVIDER} request failed: ${response.status}`
    throw new AppError(message, 502, 50210)
  }

  const parsed = ChatCompletionResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new AppError(
      `${env.AI_PROVIDER} returned an invalid response: ${JSON.stringify(parsed.error)}`,
      502,
      50211,
    )
  }

  return parsed.data.choices[0].message.content.trim()
}

export async function extractTextFromImage(base64Image: string, mimeType: string): Promise<string> {
  if (!env.AI_API_KEY) {
    throw new AppError('AI_API_KEY is not configured', 500, 50010)
  }

  if (env.AI_PROVIDER !== 'zhipu') {
    return generateText({
      model: env.AI_VISION_MODEL ?? env.AI_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            '你是中文 OCR 助手。请从招聘岗位截图中提取完整 JD 原文。只输出识别出的文本，不要解释，不要总结，不要 Markdown。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: 'text',
              text: '请识别这张岗位 JD 截图中的全部招聘文本，尽量保留公司、岗位、城市、薪资、职责、要求等信息。',
            },
          ],
        },
      ],
    })
  }

  const response = await requestLayoutParsing(base64Image)
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    const message = extractProviderError(payload) ?? `${env.AI_PROVIDER} OCR request failed: ${response.status}`
    throw new AppError(message, 502, 50210)
  }

  const parsed = LayoutParsingResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new AppError(
      `${env.AI_PROVIDER} OCR returned an invalid response: ${JSON.stringify(parsed.error)}`,
      502,
      50211,
    )
  }

  return parsed.data.md_results.trim()
}

async function requestChatCompletion(input: GenerateTextInput): Promise<Response> {
  try {
    return await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model ?? env.AI_MODEL,
        messages: input.messages,
        temperature: input.temperature ?? 0.3,
      }),
    })
  } catch (error) {
    const detail = describeNetworkError(error)
    throw new AppError(`${env.AI_PROVIDER} request failed before response: ${detail}`, 502, 50210)
  }
}

async function requestLayoutParsing(dataUrl: string): Promise<Response> {
  try {
    return await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/layout_parsing`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_OCR_MODEL,
        file: dataUrl,
      }),
    })
  } catch (error) {
    const detail = describeNetworkError(error)
    throw new AppError(`${env.AI_PROVIDER} OCR request failed before response: ${detail}`, 502, 50210)
  }
}

function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown network error'
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : ''
  return `${error.message}${cause}`
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
