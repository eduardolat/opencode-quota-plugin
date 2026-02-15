export function formatTimeUntil(dateIso: string): string {
  const target = new Date(dateIso).getTime();

  if (Number.isNaN(target)) {
    return "unknown";
  }

  const diffMs = target - Date.now();
  if (diffMs <= 0) {
    return "now";
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
