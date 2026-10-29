import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const runsDir = mkdtempSync(join(tmpdir(), 'rig-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };

const line = (job: string, status: string, owner: string | null, at: string) =>
  JSON.stringify({ at, job, status, ...(owner ? { owner } : {}) });

beforeAll(() => {
  writeFileSync(
    join(runsDir, '2026-01-01.jsonl'),
    [
      line('zeta/build', 'ok', 'rook', '2026-01-01T01:00:00+01:00'),
      line('alpha/sync', 'ok', null, '2026-01-01T02:00:00+01:00'),
      line('alpha/sync', 'ok', null, '2026-01-01T03:00:00+01:00'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(runsDir, '2026-01-02.jsonl'), '');
  writeFileSync(
    join(runsDir, '2026-01-03.jsonl'),
    [line('beta/job', 'ok', 'rook', '2026-01-03T01:00:00+01:00'), 'not json at all'].join('\n') + '\n',
  );
});

describe('digest routes', () => {
  it('page: 200 with the lane banner and jobs sorted', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html.indexOf('alpha/sync')).toBeGreaterThan(-1);
    expect(html.indexOf('alpha/sync')).toBeLessThan(html.indexOf('zeta/build'));
  });

  it('page: a null owner renders as a dash', async () => {
    const html = await (await createApp(config).request('/digest/2026-01-01')).text();
    expect(html).toContain('—');
  });

  it('page: 404 for a night with no file and for a malformed night', async () => {
    const app = createApp(config);
    expect((await app.request('/digest/2026-01-09')).status).toBe(404);
    expect((await app.request('/digest/..%2Fetc')).status).toBe(404);
  });

  it('page: an empty night says nothing ran', async () => {
    const res = await createApp(config).request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('page: a bad line keeps the good rows and reports the count', async () => {
    const res = await createApp(config).request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('beta/job');
    expect(html).toMatch(/1\s+(line|lines)/);
  });

  it('json: 200 with rows in page order', async () => {
    const app = createApp(config);
    const res = await app.request('/api/digest/2026-01-01');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-01-01');
    expect(body.rows.map((row) => row.job)).toEqual(['alpha/sync', 'zeta/build']);
    expect(body.rows[0].owner).toBeNull();
    expect(body.rows[0].runs).toBe(2);
    const html = await (await app.request('/digest/2026-01-01')).text();
    const jobs = body.rows.map((row) => html.indexOf(row.job));
    expect(jobs).toEqual([...jobs].sort((a, b) => a - b));
  });

  it('json: bad line is counted, empty night has no rows', async () => {
    const app = createApp(config);
    const bad = (await (await app.request('/api/digest/2026-01-03')).json()) as Night;
    expect(bad.badLines).toBe(1);
    expect(bad.rows).toHaveLength(1);
    const empty = (await (await app.request('/api/digest/2026-01-02')).json()) as Night;
    expect(empty.rows).toEqual([]);
  });

  it('json: 404 with error and night when there is no file', async () => {
    const res = await createApp(config).request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ night: '2026-01-09' });
  });
});
