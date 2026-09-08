import { describe, expect, it } from 'vitest'
import { detectFileType } from './file-type'

describe('detectFileType', () => {
  it('detects jpeg', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
    expect(detectFileType(buf)).toEqual({ mime: 'image/jpeg', ext: 'jpg' })
  })

  it('detects png', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    expect(detectFileType(buf)).toEqual({ mime: 'image/png', ext: 'png' })
  })

  it('detects pdf', () => {
    const buf = Buffer.from('%PDF-1.4')
    expect(detectFileType(buf)).toEqual({ mime: 'application/pdf', ext: 'pdf' })
  })

  it('rejects unknown bytes', () => {
    expect(detectFileType(Buffer.from('hello'))).toBeNull()
  })
})
