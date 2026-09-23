/**
 * RFC 4180 compliant CSV parser and generator with zero external dependencies.
 * Handles commas, double-quote escaping, newlines, and unicode.
 */

export function arrayToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((field) => {
          const str = field === null || field === undefined ? '' : String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\r\n');
}

export function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const chars = text;
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const c = chars[i];
    const next = i + 1 < len ? chars[i + 1] : '';

    if (insideQuotes) {
      if (c === '"') {
        if (next === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip the next quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += c;
      }
    } else {
      if (c === '"') {
        insideQuotes = true;
      } else if (c === ',') {
        row.push(currentField);
        currentField = '';
      } else if (c === '\r') {
        if (next === '\n') {
          i++;
        }
        row.push(currentField);
        result.push(row);
        row = [];
        currentField = '';
      } else if (c === '\n') {
        row.push(currentField);
        result.push(row);
        row = [];
        currentField = '';
      } else {
        currentField += c;
      }
    }
  }

  // Push last field & row if remaining
  if (currentField !== '' || row.length > 0) {
    row.push(currentField);
    result.push(row);
  }

  // Filter out any trailing empty lines
  return result.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}
