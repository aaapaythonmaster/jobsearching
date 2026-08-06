import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const SWIFT_OCR_SCRIPT = `
import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  fputs("cannot load image\\n", stderr)
  exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
print(lines.joined(separator: "\\n"))
`

export async function extractTextWithMacVision(buffer: Buffer, mimeType: string): Promise<string> {
  if (process.platform !== 'darwin') return ''

  const ext = imageExtension(mimeType)
  if (!ext) return ''

  const dir = await mkdtemp(path.join(tmpdir(), 'job-search-ocr-'))
  const imagePath = path.join(dir, `input.${ext}`)
  const scriptPath = path.join(dir, 'ocr.swift')

  try {
    await Promise.all([writeFile(imagePath, buffer), writeFile(scriptPath, SWIFT_OCR_SCRIPT)])
    const { stdout } = await execFileAsync('/usr/bin/swift', [scriptPath, imagePath], {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 4,
    })
    return stdout.trim()
  } catch {
    return ''
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function imageExtension(mimeType: string): string | null {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg'
  return null
}
