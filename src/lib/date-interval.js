function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isYmd(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toYmd(value) {
  if (typeof value !== "string") return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function normalizeInterval(interval) {
  if (!interval || !isYmd(interval.start) || !isYmd(interval.end)) return null;
  if (interval.start <= interval.end) return interval;
  return { start: interval.end, end: interval.start };
}

function selectionToYmdInterval(selection) {
  if (!isObject(selection)) return null;
  const mode = selection.mode;
  if (mode === "single") {
    const date = selection.date;
    if (!isYmd(date)) return null;
    return { start: date, end: date };
  }
  if (mode === "range") {
    const start = selection.start;
    const end = selection.end;
    return normalizeInterval({ start, end });
  }
  return null;
}

function notionDatePropertyToYmdInterval(prop) {
  if (!isObject(prop)) return null;
  if (prop.type !== "date") return null;
  const d = prop.date;
  if (!isObject(d)) return null;
  const start = toYmd(d.start);
  if (!start) return null;
  const end = toYmd(d.end) || start;
  return normalizeInterval({ start, end });
}

function intervalsOverlapYmd(item, selected) {
  const a = normalizeInterval(item);
  const b = normalizeInterval(selected);
  if (!a || !b) return false;
  return a.start <= b.end && a.end >= b.start;
}

module.exports = {
  intervalsOverlapYmd,
  notionDatePropertyToYmdInterval,
  selectionToYmdInterval,
  toYmd,
};

