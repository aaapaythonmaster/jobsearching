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
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) throw BadRequestError('Could not extract text from resume file')
  return normalized
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
