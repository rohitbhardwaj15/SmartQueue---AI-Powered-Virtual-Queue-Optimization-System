const SERVICE_TIME_BY_SECTOR = {
  hospital: 12,
  bank: 8,
  government: 14
};

export function getAvgServiceMinutes(sector) {
  return SERVICE_TIME_BY_SECTOR[sector] ?? 10;
}

export function calculateWaitMinutes({ queueLength, avgServiceMinutes, historicalFactor = 1 }) {
  const raw = queueLength * avgServiceMinutes * historicalFactor;
  return Math.max(2, Math.round(raw));
}

export function bucketHour(dateLike) {
  const date = new Date(dateLike);
  return date.getHours();
}

export function getPeakHours(entries) {
  const buckets = new Map();

  for (const item of entries) {
    const hour = bucketHour(item.joinedAt);
    buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
  }

  const ranked = [...buckets.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  return ranked.slice(0, 3);
}

export function getBestVisitSuggestion(peakHours, now = new Date()) {
  const currentHour = now.getHours();
  const peakSet = new Set(peakHours.map((item) => item.hour));

  if (!peakSet.has(currentHour)) {
    return "Low crowd now. Good time to visit.";
  }

  const nonPeak = [];
  for (let h = 8; h <= 19; h += 1) {
    if (!peakSet.has(h)) nonPeak.push(h);
  }

  const candidate = nonPeak.find((hour) => hour > currentHour) ?? nonPeak[0] ?? 11;
  const meridiem = candidate >= 12 ? "PM" : "AM";
  const hour12 = candidate % 12 === 0 ? 12 : candidate % 12;

  return `High traffic expected. Best time to visit: ${hour12} ${meridiem}`;
}

export function getTrafficMessage(waitMinutes) {
  if (waitMinutes >= 45) return "High traffic expected";
  if (waitMinutes >= 20) return "Moderate traffic";
  return "Low crowd now";
}
