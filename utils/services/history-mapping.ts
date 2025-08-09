import { loadHistoryRows } from "./databaseRepository.js";
import { type Content } from "@google/genai";

export function rowsToGenAiHistory(
    rows: Array<{ role: string; message: string }>
): Content[] {
    const history: Content[] = [];

    for (const r of rows) {
        if (r.role === 'user') {
            history.push({ role: 'user', parts: [{ text: r.message }] });
            continue;
        }
        if (r.role === 'assistant' || r.role === 'model') {
            history.push({ role: 'model', parts: [{ text: r.message }] });
            continue;
        }
        if (r.role === 'function') {
            try {
                const parsed = JSON.parse(r.message);
                history.push({
                    role: 'model',
                    parts: [{ functionResponse: { name: parsed.name, response: parsed.response } }],
                });
            } catch {
                history.push({
                    role: 'model',
                    parts: [{ text: `[functionResponse malformed] ${r.message}` }],
                });
            }
        }
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
    console.log('Converted history:', JSON.stringify(history, null, 2));
}

main().catch((err) => {
    console.error('Error in main:', err);
    process.exit(1);
});
*/