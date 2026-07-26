import { useData } from "@/lib/data-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function GlobalFilter() {
  const { periods, period, setPeriod } = useData();
  const value = period ? `${period.start}|${period.stop}` : "all";
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === "all") return setPeriod(null);
        const p = periods.find((x) => `${x.start}|${x.stop}` === v);
        setPeriod(p ?? null);
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All time (blended)</SelectItem>
        {periods.map((p) => (
          <SelectItem key={`${p.start}|${p.stop}`} value={`${p.start}|${p.stop}`}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
