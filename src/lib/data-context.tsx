import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getAllTabs } from "./sheets.functions";
import { parseAll, detectQuarters, type AllData, type Quarter } from "./parsers";

export const allTabsQuery = queryOptions({
  queryKey: ["workbook"],
  queryFn: () => getAllTabs(),
  staleTime: 60_000,
});

type Ctx = {
  data: AllData;
  quarters: Quarter[];
  /** null = "all time" */
  quarter: Quarter | null;
  setQuarter: (q: Quarter | null) => void;
  /** The quarter immediately before the selected one, when it has data. */
  previousQuarter: Quarter | null;
  sourceError: string | null;
  fetchedAt: string;
};

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: workbook } = useSuspenseQuery(allTabsQuery);
  const data = useMemo(() => parseAll(workbook.tabs), [workbook.tabs]);
  const quarters = useMemo(() => detectQuarters(data), [data]);
  const [quarterKey, setQuarterKey] = useState<string | null>(null);

  const value = useMemo<Ctx>(() => {
    const quarter = quarters.find((q) => q.key === quarterKey) ?? null;
    const idx = quarter ? quarters.findIndex((q) => q.key === quarter.key) : -1;
    return {
      data,
      quarters,
      quarter,
      setQuarter: (q) => setQuarterKey(q?.key ?? null),
      previousQuarter: idx > 0 ? quarters[idx - 1] : null,
      sourceError: workbook.error,
      fetchedAt: workbook.fetchedAt,
    };
  }, [data, quarters, quarterKey, workbook.error, workbook.fetchedAt]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useData must be inside DataProvider");
  return c;
}
