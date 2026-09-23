import { describe, it, expect } from 'vitest';
import { arrayToCsv, parseCsv } from './csvHelper';

describe('csvHelper', () => {
  it('correctly serializes and parses basic tables', () => {
    const data = [
      ['Name', 'Duration', 'Category'],
      ['Task 1', '300', 'Work'],
      ['Task 2', '600', 'Break'],
    ];

    const csv = arrayToCsv(data);
    const parsed = parseCsv(csv);
    expect(parsed).toEqual(data);
  });

  it('handles quotes, commas, and multiline values', () => {
    const data = [
      ['Title', 'Notes'],
      ['Read, Think, Plan', 'Line 1\nLine 2 with "quotes"'],
    ];

    const csv = arrayToCsv(data);
    const parsed = parseCsv(csv);
    expect(parsed).toEqual(data);
  });
});
