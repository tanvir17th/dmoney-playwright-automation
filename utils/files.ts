import * as fs from "fs";
import * as path from "path";

/** Local calendar date as YYYY-MM-DD, offset by the given number of days. */
export function isoDate(offsetDays = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function csvCell(value: string): string {
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function writeCsv(filePath: string, headers: string[], rows: Record<string, string>[]): void {
    const lines = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((cells) =>
        cells.map(csvCell).join(",")
    );
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}
