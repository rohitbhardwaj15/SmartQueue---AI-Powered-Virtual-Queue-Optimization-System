const SERVICE_TIME_BY_SECTOR = {
  hospital: 12,
  bank: 8,
  government: 14
};

const MIN_HISTORICAL_FACTOR = 0.7;
const MAX_HISTORICAL_FACTOR = 1.5;
const MIN_COMPLETED_SAMPLES = 10;

export function getAvgServiceMinutes(sector) {
  return SERVICE_TIME_BY_SECTOR[sector] ?? 10;
}

export function calculateWaitMinutes({ queueLength, avgServiceMinutes, historicalFactor = 1 }) {
  const raw = queueLength * avgServiceMinutes * historicalFactor;
  return Math.max(2, Math.round(raw));
}

/**
 * Derives an adjustment factor from actual observed service durations
 * (servedAt - joinedAt on completed entries) instead of a hardcoded 1.08
 * constant. This is still not a trained ML model - it's a bounded,
 * data-driven heuristic - but it means the factor reflects how long this
 * sector/branch has actually been taking recently, rather than a fixed
 * guess. Falls back to a neutral 1 when there isn't enough history yet,
 * and clamps the result so a handful of outliers can't swing predictions
 * wildly.
 */
export function computeHistoricalFactor(history, avgServiceMinutes) {
  const completed = history.filter(
    (item) => item.status === "done" && item.servedAt && item.joinedAt
  );

  if (completed.length < MIN_COMPLETED_SAMPLES || !avgServiceMinutes) {
    return 1;
  }

  const durations = completed
    .map((item) => (new Date(item.servedAt).getTime() - new Date(item.joinedAt).getTime()) / 60000)
    .filter((minutes) => Number.isFinite(minutes) && minutes > 0);

  if (!durations.length) return 1;

  const avgActual = durations.reduce((sum, m) => sum + m, 0) / durations.length;
  const ratio = avgActual / avgServiceMinutes;

  if (!Number.isFinite(ratio) || ratio <= 0) return 1;

  return Number(Math.min(MAX_HISTORICAL_FACTOR, Math.max(MIN_HISTORICAL_FACTOR, ratio)).toFixed(2));
}

/**
 * Priority is stored on each entry but previously had no effect anywhere.
 * This computes how many *effective* people are ahead of a given priority
 * in the current waiting line: only entries with priority >= the given
 * one count as "ahead", since lower-priority entries don't block it.
 * Used both to order the live queue and to size the wait estimate.
 */
export function getEffectiveQueuePosition(waitingEntries, priority = 0) {
  const ahead = waitingEntries.filter((entry) => (entry.priority ?? 0) >= priority).length;
  return ahead + 1;
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
