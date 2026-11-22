export function parseProductImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(image => typeof image === 'string' && image.trim() ? [image.trim()] : []);
  }
  if (typeof value !== 'string') return [];

  const input = value.trim();
  if (input.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(input);
      if (Array.isArray(parsed)) return parseProductImages(parsed);
    } catch {
      // Older records can contain plain text instead of a serialized array.
    }
  }

  // The first comma in a Base64 image URL separates its header from its payload.
  const entries = input.match(/data:image\/[\w.+-]+;base64,[a-z\d+/]+={0,2}|[^\s,][^,\r\n]*/gi) ?? [];
  return parseProductImages(entries);
}
