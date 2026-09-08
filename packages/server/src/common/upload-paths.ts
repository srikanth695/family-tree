import * as path from 'path';

/** Absolute upload root. Docker sets UPLOAD_ROOT=/app/uploads. */
export function getUploadRoot(): string {
  return path.resolve(process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads'));
}

export function getMediaUploadDir(): string {
  return path.join(getUploadRoot(), 'media');
}
