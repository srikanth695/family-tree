const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((byte, i) => buf[offset + i] === byte);
}

export type DetectedFileType = {
  mime: string;
  ext: string;
};

/** Detect image/pdf type from magic bytes (ignores client Content-Type). */
export function detectFileType(buffer: Buffer): DetectedFileType | null {
  if (startsWith(buffer, JPEG)) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (startsWith(buffer, PNG)) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (startsWith(buffer, GIF87) || startsWith(buffer, GIF89)) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  if (startsWith(buffer, PDF)) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  if (
    startsWith(buffer, WEBP_RIFF) &&
    buffer.length >= 12 &&
    startsWith(buffer, WEBP_WEBP, 8)
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}
