import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatDateTime = (date) => (date ? dayjs(date).format('MMM D, YYYY h:mm A') : '-');
export const formatDate = (date) => (date ? dayjs(date).format('MMM D, YYYY') : '-');
export const fromNow = (date) => dayjs(date).fromNow();
export const isPast = (date) => dayjs(date).isBefore(dayjs());

// Value format expected by <input type="datetime-local">
export const toInputDateTime = (date) => dayjs(date).format('YYYY-MM-DDTHH:mm');

export function percent(score, maxPoints) {
  if (score === null || score === undefined || !maxPoints) return null;
  return Math.round((score / maxPoints) * 1000) / 10;
}

export function letterGrade(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export function gradeVariant(pct) {
  if (pct === null || pct === undefined) return 'secondary';
  if (pct >= 80) return 'success';
  if (pct >= 60) return 'warning';
  return 'danger';
}

export const formatScore = (score) => (score === null || score === undefined ? '-' : Number(score).toString());
