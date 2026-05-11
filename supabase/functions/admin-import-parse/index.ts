import { authMiddleware } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { json, jsonError } from '../_shared/response.ts';

type ImportKind = 'students' | 'teachers';

const REQUIRED_COLUMNS: Record<ImportKind, string[]> = {
  students: ['full_name', 'gender', 'grade'],
  teachers: ['full_name', 'default_password'],
};

const EDGE_XLSX_DECISION = {
  accepted: false,
  parser: 'csv-only',
  reason:
    'Supabase Edge Functions run on Deno, and SheetJS documents Deno support as experimental. Production imports are CSV-first for Edge deployment.',
} as const;

function isImportKind(value: string | null): value is ImportKind {
  return value === 'students' || value === 'teachers';
}

function normalizeRows(kind: ImportKind, rows: Record<string, unknown>[]) {
  if (kind === 'students') {
    return rows.map((row) => ({
      full_name: typeof row.full_name === 'string' ? row.full_name.trim() : row.full_name,
      gender: typeof row.gender === 'string' ? row.gender.trim().toLowerCase() : row.gender,
      grade: typeof row.grade === 'string' ? Number(row.grade) : row.grade,
      section: typeof row.section === 'string' ? row.section.trim() : row.section,
    }));
  }

  return rows.map((row) => ({
    full_name: typeof row.full_name === 'string' ? row.full_name.trim() : row.full_name,
    subjects: typeof row.subjects === 'string' ? row.subjects.trim() : row.subjects,
    default_password:
      typeof row.default_password === 'string' ? row.default_password.trim() : row.default_password,
  }));
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvRows(text: string) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length === 0) {
    return [] as Record<string, string>[];
  }

  const headers = parseCsvLine(rawLines[0]);
  return rawLines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

function detectFileKind(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type.includes('csv')) {
    return 'csv' as const;
  }

  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    file.type.includes('spreadsheetml') ||
    file.type.includes('ms-excel')
  ) {
    return 'spreadsheet' as const;
  }

  return 'unknown' as const;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method === 'GET') {
    return withCors(
      request,
      json({
        status: 'compatibility-checked',
        import_parser: EDGE_XLSX_DECISION,
      })
    );
  }

  if (request.method !== 'POST') {
    return withCors(request, jsonError(405, 'Method not allowed'));
  }

  const { response } = await authMiddleware(request, ['admin']);
  if (response) {
    return withCors(request, response);
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  if (!isImportKind(kind)) {
    return withCors(request, jsonError(400, 'Invalid import kind'));
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return withCors(request, jsonError(400, 'Missing spreadsheet file'));
  }

  const fileKind = detectFileKind(file);
  if (fileKind === 'spreadsheet') {
    return withCors(
      request,
      json(
        {
          error:
            'Supabase Edge import parsing is CSV-only. Convert the file to CSV and upload that instead.',
          compatibility: EDGE_XLSX_DECISION,
        },
        { status: 415 }
      )
    );
  }

  if (fileKind !== 'csv') {
    return withCors(
      request,
      jsonError(400, 'Unsupported file type. Upload a CSV file with the required header row.')
    );
  }

  const text = await file.text();
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return withCors(
      request,
      jsonError(400, 'The file is empty. Add at least one data row below the header row and try again.')
    );
  }

  const firstRow = rows[0] ?? {};
  const missingColumns = REQUIRED_COLUMNS[kind].filter((column) => !(column in firstRow));
  if (missingColumns.length > 0) {
    return withCors(
      request,
      jsonError(
        400,
        `Missing required columns: ${missingColumns.join(', ')}. Download the CSV template and keep the header row unchanged.`
      )
    );
  }

  return withCors(
    request,
    json({
      rows: normalizeRows(kind, rows),
      compatibility: {
        ...EDGE_XLSX_DECISION,
        accepted: true,
        parser: 'csv',
      },
    })
  );
});
