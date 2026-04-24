import { fileLooksTooLarge, parseCsv } from '$lib/csv';

export function validateStashName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Stash name is required.');
  if (trimmed.length > 100) throw new Error('Stash name must be 100 characters or fewer.');
  return trimmed;
}

export async function parseUploadFile(file: File) {
  if (fileLooksTooLarge(file.size)) {
    throw new Error('CSV file must be 5 MB or smaller.');
  }

  const text = await file.text();
  const preview = parseCsv(text);

  if (preview.validAlbums === 0) {
    throw new Error('No valid rows found. The CSV must include Artist and Title columns.');
  }

  if (preview.validAlbums > 2000) {
    throw new Error('Stashes are limited to 2,000 valid albums.');
  }

  return preview;
}
