import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getAllTabs } from "./sheets.functions";
import { parseAll, detectPeriods, type AllData } from "./parsers";

export const allTabsQuery = queryOptions({
  queryKey: ["all-tabs"],
  queryFn: () => getAllTabs(),
  staleTime: 60_000,
});

export type Period = { label: string; start: string; stop: string } | null;

type Ctx = {
  data: AllData;
  periods: { label: string; start: string; stop: string }[];
  period: Period;
  setPeriod: (p: Period) => void;
};

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: raw } = useSuspenseQuery(allTabsQuery);
  const data = useMemo(() => parseAll(raw as never), [raw]);
  const periods = useMemo(() => detectPeriods(data.meta, data.google), [data]);
  const [period, setPeriod] = useState<Period>(null);
  return (
    <DataCtx.Provider value={{ data, periods, period, setPeriod }}>{children}</DataCtx.Provider>
  );
}

export function useData() {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useData must be inside DataProvider");
  return c;
}
