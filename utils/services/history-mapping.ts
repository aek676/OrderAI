import { writeFileSync } from "fs";
import { loadHistoryRows } from "./databaseRepository.js";
import { type Content, type Part } from "@google/genai";
import type { Json } from "../../types/database.types.js";

function ensurePartsArray(parts: any): any[] {
    if (Array.isArray(parts)) return parts;
    if (parts == null) return [{ text: '' }];
    return [parts];
}

export function rowsToGenAiHistory(
    rows: Array<{ role: string; parts: Json }>
): Content[] {
    const history: Content[] = [];

    for (const r of rows) {
        history.push({ role: r.role, parts: r.parts as Part[] });
    }
    return history;
}
/*
async function main() {
    const rows = await loadHistoryRows('855e9331-7bb6-434c-81e6-56d951f6116b');
    const history = rowsToGenAiHistory(rows?.map(row => ({
        role: row.role,
        message: row.message,
    })) || []);
    console.log("History saved to historial_chat_db.json");
    writeFileSync('historial_chat_db.json', JSON.stringify(history, null, 2), 'utf-8');
}

main().catch((err) => {
    console.error('Error in main:', err);
    process.exit(1);
});

*/