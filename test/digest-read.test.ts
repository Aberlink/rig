import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('folds 2026-10-28 into one row per job and counts the cut-off line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night?.statusCounts).toEqual({ ok: 10, retry: 4, fail: 1 });

    const row = (job: string) => night?.rows.find((r) => r.job === job);
    expect(row('fixtures/refresh')).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null });
    expect(row('notes/backup')).toMatchObject({ fails: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(row('digest/render')?.owner).toBeNull();
    expect(row('lane/sync')).toMatchObject({
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
  });

  it('reads an empty file as a night with no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-10-30.jsonl'), '');
    expect(readNight(dir, '2026-10-30')).toEqual({
      night: '2026-10-30',
      rows: [],
      badLines: 0,
      statusCounts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('returns null for a missing night or a night that is not a date', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    expect(readNight(dir, '2026-10-31')).toBeNull();
    expect(readNight(dir, '../runs/2026-10-28')).toBeNull();
  });
});
