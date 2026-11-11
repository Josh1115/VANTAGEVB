import { describe, it, expect, vi } from 'vitest';
vi.mock('jspdf', () => ({ default: class {} }));
vi.mock('jspdf-autotable', () => ({ default: () => {} }));
import { buildSectionedCsv } from '../export';
import { exportTeamLabel, exportHint, exportFilename } from '../../utils/exportLabel';

describe('buildSectionedCsv', () => {
  it('stacks titled sections with headers and blank spacers', () => {
    const csv = buildSectionedCsv([
      { title: 'SEASONS', columns: ['Year', 'Wins'], rows: [['2025', 20]] },
      { title: 'COMMITS', columns: ['Player'], rows: [] },
    ]);
    const lines = csv.split(/\r?\n/);
    expect(lines[0]).toBe('SEASONS');
    expect(lines[1]).toBe('Year,Wins');
    expect(lines[2]).toBe('2025,20');
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe('COMMITS');
    expect(lines[6]).toBe('(none)');
  });
});

describe('export labels', () => {
  const both = { F: [{ id: 1 }], M: [{ id: 2 }] };
  it('adds gender unless already in the name', () => {
    expect(exportTeamLabel({ name: 'Varsity' }, 'F')).toBe('Girls Varsity');
    expect(exportTeamLabel({ name: 'Boys Varsity' }, 'M')).toBe('Boys Varsity');
    expect(exportTeamLabel({ name: 'Girls', age_group: '16U' }, 'F')).toBe('Girls 16U');
    expect(exportTeamLabel(null, null)).toBe("this team's");
  });
  it('hint matches team setup', () => {
    expect(exportHint('F', both, 'history')).toBe('Only Girls history. Switch to Boys to export theirs.');
    expect(exportHint('F', { F: [{}, {}] }, 'records')).toMatch(/Pick another team/);
    expect(exportHint('F', { F: [{}] }, 'records')).toBe("Exports this team's records.");
  });
  it('filename strips bad characters', () => {
    expect(exportFilename('History', 'St. Mary/Joseph', 'Varsity')).toMatch(/^History - St\. MaryJoseph - Varsity - \d{4}-\d{2}-\d{2}\.csv$/);
  });
});
