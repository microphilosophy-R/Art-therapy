/**
 * Validates a file against size and type constraints.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateFile(
  file: File,
  opts: { maxMb: number; accept: string[] }
): string | null {
  if (file.size > opts.maxMb * 1024 * 1024) {
    return `File too large. Maximum size is ${opts.maxMb} MB.`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!opts.accept.includes(ext)) {
    return `Unsupported format. Allowed: ${opts.accept.join(', ')}`;
  }
  return null;
}
