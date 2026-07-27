import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";
import { useI18n } from "@/lib/i18n";

export function ExportButton({
  filename,
  sheets,
}: {
  filename: string;
  sheets: { name: string; rows: (string | number)[][] }[];
}) {
  const { t } = useI18n();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportToExcel(filename, sheets)}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {t("common.export")}
    </Button>
  );
}
