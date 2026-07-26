import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { analyzeInsights } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "./panel";

/**
 * Sends the current, filtered view to the strategy model. `payload` is
 * serialised by the caller so the model sees exactly what is on screen.
 */
export function AiPanel({ payload, context }: { payload: unknown; context: string }) {
  const run = useServerFn(analyzeInsights);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gen = useMutation({
    mutationFn: () => run({ data: { summary: JSON.stringify(payload, null, 2) } }),
    onSuccess: (r) => {
      setText(r.text);
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "AI request failed"),
  });

  return (
    <Panel className="border-l-2 border-l-primary">
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            AI strategy read
          </span>
        }
        hint={`Analyses ${context} exactly as filtered above.`}
        actions={
          <Button size="sm" variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? "Analysing…" : text ? "Regenerate" : "Analyse this view"}
          </Button>
        }
      />

      {error && (
        <p className="mt-3 border-l-2 border-negative bg-accent px-3 py-2 text-xs text-accent-foreground">
          {error}
        </p>
      )}

      {text ? (
        <div className="prose prose-sm mt-4 max-w-none dark:prose-invert prose-headings:font-display prose-p:text-foreground prose-li:text-foreground">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      ) : (
        !error && (
          <p className="mt-3 text-sm text-muted-foreground">
            Generates an executive summary and two recommendations from the numbers currently on
            screen.
          </p>
        )
      )}
    </Panel>
  );
}
