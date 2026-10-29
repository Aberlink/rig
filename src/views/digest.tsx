import type { Night } from '../digest/types.js';

const dash = (value: string | null) => value ?? '—';

export function Digest({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>fails</th>
              <th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <tr class={row.retries >= 3 || row.fails > 0 ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{dash(row.owner)}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.fails}</td>
                <td>{row.lastStatus}</td>
                <td>{dash(row.lastError)}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 && (
        <p class="mute">{night.badLines} {night.badLines === 1 ? "line didn't" : "lines didn't"} parse</p>
      )}
    </>
  );
}
