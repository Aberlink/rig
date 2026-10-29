// One job's night, folded from its log lines. Missing owner or error stays null; views render it as —.
export type Status = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  fails: number;
  lastStatus: Status;
  lastError: string | null;
  firstAt: string; // ISO with offset, as written in the log
  lastAt: string;
};

// rows is empty when the file exists but nothing ran; badLines counts lines that didn't parse.
// statusCounts counts parsed lines per status (the board shows them beside each night).
export type Night = { night: string; rows: DigestRow[]; badLines: number; statusCounts: Record<Status, number> };

// null means no log file for that night (route answers 404).
export type ReadNight = (runsDir: string, night: string) => Night | null;
