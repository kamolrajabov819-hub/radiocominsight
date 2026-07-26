import { parseAll, type AllData } from "../parsers";
import { fetchWorkbook } from "../sheets.functions";

/**
 * MCP callers want a hard failure rather than an empty dataset, so the
 * shared workbook fetch is reused and its soft error is rethrown here.
 */
export async function fetchAllData(): Promise<AllData> {
  const workbook = await fetchWorkbook();
  if (workbook.error) throw new Error(workbook.error);
  return parseAll(workbook.tabs);
}
