"use client";

import type { AppState } from "@/lib/api";

type DailyLog = AppState["recent_logs"][number];

type DailyScorePoint = {
  date: string;
  label: string;
  score: number;
};

const CHART_WIDTH = 1120;
const CHART_HEIGHT = 320;
const PADDING = { top: 16, right: 22, bottom: 38, left: 44 };
const MAX_SCORE = 100;
const Y_TICKS = [0, 25, 50, 75, 100];
const NUTRITION_SCORE = 30;

export function DailyScoreChart({ recentLogs }: { recentLogs: DailyLog[] }) {
  const points = buildDailyScorePoints(recentLogs);
  const chartAreaWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartAreaHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const coordinates = points.map((point, index) => {
    const x = PADDING.left + (index / (points.length - 1 || 1)) * chartAreaWidth;
    const y = PADDING.top + ((MAX_SCORE - point.score) / MAX_SCORE) * chartAreaHeight;
    return { ...point, x, y };
  });

  const linePath = buildSmoothPath(coordinates);

  return (
    <section className="glass-panel rounded-[28px] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Daily score</h2>
          <p className="text-sm text-slate-700"></p>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-[280px] min-w-[760px] w-full"
          role="img"
          aria-label="Daily score trend line chart"
        >
          <defs>
            <linearGradient id="dailyScoreLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2cab66" />
              <stop offset="100%" stopColor="#2fb4ff" />
            </linearGradient>
          </defs>

          {Y_TICKS.map((tick) => {
            const y = PADDING.top + ((MAX_SCORE - tick) / MAX_SCORE) * chartAreaHeight;
            return (
              <g key={tick}>
                <line x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(20,50,36,0.12)" strokeWidth="1" />
                <text x={PADDING.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(20,50,36,0.65)">
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={linePath} fill="none" stroke="url(#dailyScoreLine)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

          {coordinates.map((point) => (
            <g key={point.date}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="#2cab66" />
              <circle cx={point.x} cy={point.y} r="8" fill="rgba(44,171,102,0.2)" />
            </g>
          ))}

          {coordinates.map((point, index) => {
            if (index % 6 !== 0 && index !== coordinates.length - 1) return null;
            return (
              <text key={`${point.date}-label`} x={point.x} y={CHART_HEIGHT - 10} textAnchor="middle" fontSize="11" fill="rgba(20,50,36,0.72)">
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function buildDailyScorePoints(recentLogs: DailyLog[]): DailyScorePoint[] {
  const logByDate = new Map<string, DailyLog>();
  for (const log of recentLogs) {
    if (!logByDate.has(log.log_date)) logByDate.set(log.log_date, log);
  }

  const dates = getLast30Dates();
  return dates.map((date) => {
    const log = logByDate.get(date.isoDate);
    return {
      date: date.isoDate,
      label: date.shortLabel,
      score: log ? calculateDailyScore(log) : 0
    };
  });
}

function calculateDailyScore(log: DailyLog) {
  const workoutScore = log.workout ? 40 : 0;
  const waterLiters = (log.water_cups ?? 0) / 4;
  const waterScore = Math.min(waterLiters / 6, 1) * 30;
  return Math.round(workoutScore + NUTRITION_SCORE + waterScore);
}

function getLast30Dates() {
  const now = new Date();
  const result: Array<{ isoDate: string; shortLabel: string }> = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const value = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    result.push({
      isoDate: toIsoDateLocal(value),
      shortLabel: value.toLocaleDateString(undefined, { month: "short", day: "2-digit" })
    });
  }
  return result;
}

function toIsoDateLocal(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += ` Q ${midX} ${previous.y}, ${midX} ${(previous.y + current.y) / 2}`;
    path += ` T ${current.x} ${current.y}`;
  }
  return path;
}
