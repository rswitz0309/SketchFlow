export function relativeTime(input: string | Date, now: Date = new Date()): string {
  const then = typeof input === 'string' ? new Date(input) : input;
  const diffMs = now.getTime() - then.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk} wk ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.round(day / 365);
  return `${yr} yr ago`;
}
