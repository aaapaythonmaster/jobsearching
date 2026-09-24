import { PDFParse } from 'pdf-parse'
import * as mammoth from 'mammoth'
import { BadRequestError } from '@/utils/http-error'
import type { ResumeFileType } from './job-search.schema'

export function detectResumeFileType(filename: string, mimetype: string): ResumeFileType {
  const lowerName = filename.toLowerCase()
  if (lowerName.endsWith('.pdf') || mimetype === 'application/pdf') return 'pdf'
  if (
    lowerName.endsWith('.docx') ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  throw BadRequestError('Only PDF and DOCX resume files are supported')
}

export async function extractResumeText(
  buffer: Buffer,
  fileType: ResumeFileType,
): Promise<string> {
  const text = fileType === 'pdf' ? await extractPdfText(buffer) : await extractDocxText(buffer)
  const normalized = normalizeResumeText(text)
  if (!normalized) throw BadRequestError('Could not extract text from resume file')
  return normalized
}

/**
 * PDF/OCR extraction often inserts tabs, repeated spaces and line breaks in
 * the middle of a sentence. Keep intentional blank lines and list/headings,
 * but normalize the noise before the text reaches the editor.
 */
export function normalizeResumeText(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []
  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t\u00a0]+/g, ' ').trim()
    if (!line) {
      if (output.length && output[output.length - 1] !== '') output.push('')
      continue
    }
    const previous = output[output.length - 1]
    const startsNewBlock = /^(?:[-•*]\s|\d+[.)]|[一二三四五六七八九十]+[、.．]|教育背景|实习经历|项目经历|技能|工作经历|自我评价)/.test(line)
    if (previous && previous !== '' && !startsNewBlock && !/[。！？；：:]$/.test(previous)) {
      output[output.length - 1] = `${previous} ${line}`.replace(/\s+/g, ' ')
    } else {
      output.push(line)
    }
  }
  while (output[output.length - 1] === '') output.pop()
  return output.join('\n').trim()
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
