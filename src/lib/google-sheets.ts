import { createLogger } from "@/lib/logger";

const log = createLogger("google-sheets");

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export type AppendRowResult = {
  updatedRange: string;
  updatedRows: number;
  message: string;
};

/**
 * Appends a single row of values to a Google Sheet using the Sheets API v4.
 *
 * @param accessToken - The user's OAuth2 access token for Google.
 * @param sheetId     - The spreadsheet ID (from the Google Sheets URL).
 * @param values      - An array of string cell values for the new row.
 * @returns An object describing the appended range and row count.
 */
export async function appendRow(
  accessToken: string,
  sheetId: string,
  values: string[],
): Promise<AppendRowResult> {
  if (!accessToken) {
    throw new Error("Google access token is missing.");
  }

  if (!sheetId) {
    throw new Error("Google Sheet ID is missing.");
  }

  if (!values || values.length === 0) {
    throw new Error("Row values must contain at least one entry.");
  }

  const url = new URL(`${SHEETS_API_BASE}/${encodeURIComponent(sheetId)}/values/Sheet1:append`);
  url.searchParams.set("valueInputOption", "USER_ENTERED");
  url.searchParams.set("insertDataOption", "INSERT_ROWS");

  log.info("Appending row to Google Sheet.", { sheetId, columnCount: values.length });

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    log.error("Google Sheets API error.", { status: response.status, body: errorBody });
    throw new Error(
      `Google Sheets API returned ${response.status}: ${errorBody}`,
    );
  }

  const data = await response.json();
  const updates = data.updates ?? {};

  const result: AppendRowResult = {
    updatedRange: updates.updatedRange ?? "unknown",
    updatedRows: updates.updatedRows ?? 1,
    message: `Row appended successfully to range ${updates.updatedRange ?? sheetId}.`,
  };

  log.info("Row appended.", result);

  return result;
}
