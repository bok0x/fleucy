import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export { dayjs };

/** Format a DB timestamptz string for display: "Apr 27, 2026" */
export function fmtDate(iso: string): string {
  return dayjs(iso).format('MMM D, YYYY');
}

/** Format a DB timestamptz string with time: "Apr 27, 2026 14:30" */
export function fmtDateTime(iso: string): string {
  return dayjs(iso).format('MMM D, YYYY HH:mm');
}

/** Format a DB date string (YYYY-MM-DD): "Apr 27" */
export function fmtShortDate(iso: string): string {
  return dayjs(iso).format('MMM D');
}

/** Relative time: "3 days ago" */
export function fmtRelative(iso: string): string {
  return dayjs(iso).fromNow();
}

/** ISO string for today at midnight UTC */
export function todayIso(): string {
  return dayjs().startOf('day').toISOString();
}

/** First day of current month as ISO date string: "2026-04-01" */
export function startOfMonthIso(): string {
  return dayjs().startOf('month').format('YYYY-MM-DD');
}

/** Last day of current month as ISO date string: "2026-04-30" */
export function endOfMonthIso(): string {
  return dayjs().endOf('month').format('YYYY-MM-DD');
}
