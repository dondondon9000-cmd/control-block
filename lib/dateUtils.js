export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function toISODate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function startOfMonth(year, month) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function endOfMonth(year, month) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}
