export type Sector = "hospital" | "bank" | "government";

export type QueueEntry = {
  _id: string;
  tokenNumber: string;
  userName: string;
  phone: string;
  sector: Sector;
  branchName: string;
  status: "waiting" | "serving" | "done";
  predictedWaitMinutes: number;
  joinedAt: string;
};

export type Overview = {
  totalInQueue: number;
  waiting: number;
  serving: number;
  avgWaitingTime: number;
  peakHours: Array<{ hour: number; count: number }>;
};

export type TrendResponse = {
  dailyTrend: Array<{ date: string; count: number }>;
  weeklyBuckets: Array<{ label: string; count: number }>;
  hourlyHeatmap: Array<{ hour: number; count: number }>;
};
