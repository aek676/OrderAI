import { writeFileSync, appendFileSync } from "fs";
import { getOrderWithDetailsOrder, getProductsEstablishment, loadHistoryRows, saveMessage } from "./utils/services/databaseRepository.js";
import { rowsToGenAiHistory } from "./utils/services/history-mapping.js";

const idChatFromClient = '855e9331-7bb6-434c-81e6-56d951f6116b';
const orderId = '2d679c20-72c7-4c6c-a273-663604c83851';

const rows = await loadHistoryRows(idChatFromClient);
const history = rowsToGenAiHistory((rows ?? []).map(r => ({ role: r.role, parts: r.parts })));
function logToFile(message: string) {
    console.log(message);
    appendFileSync("output.txt", message + "\n");
}

// Reemplaza todos los console.log por logToFile

const hasAnyOrder = history.some(m =>
    (m.parts ?? []).some(p => p.functionResponse?.name === 'add_order')
);

const order = await getOrderWithDetailsOrder(orderId);
console.log('Order with details:');
console.log(JSON.stringify(order, null, 2));
for (const detail of order?.details_order ?? []) {
    if (detail.id_menu) {
        
    }

    const product = await getProductsEstablishment(detail.id_product);
    console.log('Product details:');
    console.log(JSON.stringify(product, null, 2));
}