export async function getResponseErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }
  } else {
    const text = await response.text().catch(() => '');
    if (text.trim()) {
      return text.trim();
    }
  }

  return fallback;
}

export function normalizeErrorMessage(message: string): string {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.includes('missing bearer token') ||
    lower.includes('invalid or expired token') ||
    lower.includes('invalid teacher token')
  ) {
    return 'Your session expired. Please sign in again.';
  }

  if (lower === 'forbidden') {
    return 'You no longer have access to this page. Please sign in again.';
  }

  if (lower.includes('invalid password')) {
    return 'Wrong password. Please try again.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'Wrong teacher password. Please try again.';
  }

  if (lower.includes('deactivated')) {
    return 'This account has been deactivated. Contact an administrator.';
  }

  return trimmed;
}

export function normalizeImportErrorMessage(message: string): string {
  const trimmed = normalizeErrorMessage(message);
  const lower = trimmed.toLowerCase();

  if (lower.includes('missing required columns')) {
    return trimmed;
  }

  if (lower.includes('failed to parse excel file')) {
    return 'The file could not be parsed. Upload a valid .xlsx, .xls, or .csv file with the template headers in the first row.';
  }

  if (lower.includes('failed to read file')) {
    return 'The selected file could not be read. Try exporting it again and upload a valid .xlsx, .xls, or .csv file.';
  }

  if (lower.includes('csv-only')) {
    return 'The spreadsheet could not be converted for upload. Try saving it again in Excel and re-uploading the file.';
  }

  return trimmed;
}
