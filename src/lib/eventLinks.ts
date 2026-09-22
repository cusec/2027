export const EVENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export function eventIdFrom(name: string, date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return null;

  const stem = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 53)
    .replace(/-$/g, "");

  const id = `${stem}-${date}`;
  return stem && EVENT_ID_PATTERN.test(id) ? id : null;
}
