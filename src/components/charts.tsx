import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Palette
 *
 * Fixed slot order — a series keeps its hue when a filter removes its
 * neighbours. Never index these by rank.
 * ------------------------------------------------------------------ */

export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

/** Sequential blue ramp for ordered marks (funnel stages, watch-through). */
export const SEQ = [
  "var(--seq-2)",
  "var(--seq-3)",
  "var(--seq-4)",
  "var(--seq-5)",
  "var(--seq-6)",
] as const;

/** Colour follows the channel, never its position in a sorted list. */
export const CHANNEL_COLOR: Record<string, string> = {
  "Meta Ads": SERIES[0],
  "Google Ads": SERIES[1],
  OLX: SERIES[2],
  Instagram: SERIES[3],
  Facebook: SERIES[4],
  "Google Analytics": SERIES[5],
  Search: SERIES[1],
  "Display & other": SERIES[3],
};

export const surfaceStroke = "var(--color-surface)";

/* ------------------------------------------------------------------ *
 * Shared axis / grid chrome — solid hairlines, recessive
 * ------------------------------------------------------------------ */

const tick = {
  fill: "var(--color-muted-foreground)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
} as const;

export const gridProps = {
  stroke: "var(--rule)",
  strokeWidth: 1,
  vertical: false,
} as const;

export const xAxisProps = {
  tick,
  tickLine: false,
  axisLine: { stroke: "var(--rule)" },
  height: 28,
} as const;

export const yAxisProps = {
  tick,
  tickLine: false,
  axisLine: false,
  width: 52,
} as const;

export const barCursor = { fill: "var(--color-surface-sunken)" } as const;
export const lineCursor = { stroke: "var(--rule)", strokeWidth: 1 } as const;

export const Grid = () => <CartesianGrid {...gridProps} />;

/* ------------------------------------------------------------------ *
 * Tooltip
 * ------------------------------------------------------------------ */

type TooltipEntry = {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

export type TooltipFormat = (value: number, key: string) => string;

export function TooltipCard(props: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format?: TooltipFormat;
  /** Extra line rendered under the series list. */
  footer?: (payload: TooltipEntry[]) => ReactNode;
}) {
  const { active, payload, label, format, footer } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-44 border border-border bg-popover px-3 py-2 shadow-lg">
      {label !== undefined && label !== "" && (
        <div className="eyebrow mb-1.5 text-foreground">{label}</div>
      )}
      <ul className="space-y-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: p.color }} aria-hidden />
              <span className="truncate text-muted-foreground">{p.name}</span>
            </span>
            <span className="tnum shrink-0">
              {format && typeof p.value === "number"
                ? format(p.value, String(p.dataKey ?? ""))
                : String(p.value ?? "—")}
            </span>
          </li>
        ))}
      </ul>
      {footer?.(payload)}
    </div>
  );
}

/** `<ChartTooltip format={...} />` — thin wrapper so pages stay readable. */
export function ChartTooltip({
  format,
  cursor = barCursor,
  footer,
}: {
  format?: TooltipFormat;
  cursor?: object | false;
  footer?: (payload: TooltipEntry[]) => ReactNode;
}) {
  return (
    <Tooltip
      cursor={cursor}
      wrapperStyle={{ outline: "none" }}
      content={<TooltipCard format={format} footer={footer} />}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Sparkline — tiny trend inside a stat tile
 * ------------------------------------------------------------------ */

export function Sparkline({
  points,
  className,
  color = "var(--chart-1)",
}: {
  points: number[];
  className?: string;
  color?: string;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = 100 / (points.length - 1);
  const coords = points.map((p, i) => [i * stepX, 26 - ((p - min) / span) * 22] as const);
  const line = coords
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L100 28 L0 28 Z`;
  const last = coords[coords.length - 1];

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className={cn("h-7 w-full", className)}
      aria-hidden
    >
      <path d={area} fill={color} opacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Donut — part-to-whole only, at most six slices
 * ------------------------------------------------------------------ */

export type Slice = { name: string; value: number; color: string };

export function Donut({
  data,
  format,
  centerLabel,
  centerValue,
  height = 240,
}: {
  data: Slice[];
  format?: TooltipFormat;
  centerLabel?: string;
  centerValue?: string;
  height?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={1.5}
            stroke={surfaceStroke}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ outline: "none" }}
            content={
              <TooltipCard
                format={(v, k) =>
                  `${format ? format(v, k) : v.toLocaleString("en-US")}${
                    total > 0 ? ` · ${((v / total) * 100).toFixed(1)}%` : ""
                  }`
                }
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            {centerValue && <div className="figure text-xl leading-none">{centerValue}</div>}
            {centerLabel && <div className="eyebrow mt-1.5">{centerLabel}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Horizontal ranking bars — one series, one colour, labels outside
 * ------------------------------------------------------------------ */

export function HBarRanking({
  data,
  color = SERIES[0],
  format = (v) => v.toLocaleString("en-US"),
  height,
  labelWidth = 150,
  seriesName = "Value",
}: {
  data: { label: string; value: number }[];
  color?: string;
  format?: (v: number) => string;
  height?: number;
  labelWidth?: number;
  seriesName?: string;
}) {
  const h = height ?? Math.max(140, data.length * 26 + 24);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 64, bottom: 4, left: 0 }}
          barCategoryGap={4}
        >
          <CartesianGrid {...gridProps} horizontal={false} vertical />
          <XAxis type="number" {...xAxisProps} hide />
          <YAxis
            type="category"
            dataKey="label"
            {...yAxisProps}
            width={labelWidth}
            tick={{ ...tick, fontFamily: "var(--font-sans)" }}
            interval={0}
          />
          <ChartTooltip format={(v) => format(v)} />
          <Bar dataKey="value" name={seriesName} fill={color} radius={[0, 3, 3, 0]} maxBarSize={16}>
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              formatter={(v: unknown) => format(Number(v))}
              style={{
                fill: "var(--color-muted-foreground)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ordinal stage bars — funnel / watch-through, sequential ramp
 * ------------------------------------------------------------------ */

export function StageBars({
  data,
  format = (v) => v.toLocaleString("en-US"),
  height = 220,
}: {
  data: { label: string; value: number; note?: string }[];
  format?: (v: number) => string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 22, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="label"
            {...xAxisProps}
            tick={{ ...tick, fontFamily: "var(--font-sans)" }}
          />
          <YAxis {...yAxisProps} tickFormatter={(v: number) => format(v)} />
          <ChartTooltip format={(v) => format(v)} />
          <Bar dataKey="value" name="Stage" radius={[3, 3, 0, 0]} maxBarSize={72}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={SEQ[Math.min(i, SEQ.length - 1)]} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              offset={6}
              formatter={(v: unknown) => format(Number(v))}
              style={{
                fill: "var(--color-muted-foreground)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
