// src/app.ts
import 'dotenv/config';
import { createInterface } from 'readline/promises';
import {
    FunctionCallingConfigMode,
    GoogleGenAI,
    Type,
    type FunctionDeclaration,
} from '@google/genai';

import { buildSnapshot, type Snapshot } from './snapshot.js';

// ======================
// IDs inyectados (ENV/UI/cliente)
// ======================
const idChatFromClient = process.env.ID_CHAT || `CHAT_${Date.now()}`;
const idEstablishmentFromClient =
    process.env.ID_ESTABLISHMENT || 'c7831588-4953-40c5-bdcf-02809d8a2370';

// ======================
// Tools (function declarations)
// ======================
const getEstablishmentSnapshot: FunctionDeclaration = {
    name: 'get_establishment_snapshot',
    description: 'Devuelve datos ACTUALES del establecimiento (info, horario, productos, menús, precios).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            id_establishment: { type: Type.STRING, description: 'ID del establecimiento' },
        },
        required: ['id_establishment'],
    },
};

const addOrder: FunctionDeclaration = {
    name: 'add_order',
    description: 'Añade un nuevo pedido al sistema.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            id_chat: { type: Type.STRING, description: 'ID del chat asociado al pedido.' },
            id_establishment: { type: Type.STRING, description: 'ID del establecimiento.' },
            name: { type: Type.STRING, description: 'Nombre del cliente.' },
            is_pickup: { type: Type.BOOLEAN, description: 'true: recogida; false: domicilio.' },
            address: { type: Type.STRING, description: 'Dirección (requerida si is_pickup=false).' },
        },
        required: ['id_chat', 'id_establishment', 'is_pickup', 'name'],
    },
};

const addDetailsOrder: FunctionDeclaration = {
    name: 'add_details_order',
    description: 'Añade detalles específicos de un pedido (producto o menú).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            details: {
                type: Type.ARRAY,
                description: 'Lista de detalles del pedido.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id_order: { type: Type.STRING, description: 'ID del pedido.' },
                        id_product: { type: Type.STRING, description: 'ID del producto (si no es menú).' },
                        id_menu: { type: Type.STRING, description: 'ID del menú (si no es producto).' },
                        selected_products: {
                            type: Type.ARRAY,
                            description: 'IDs de productos seleccionados para el menú.',
                            items: { type: Type.STRING },
                        },
                        quantity: { type: Type.INTEGER, minimum: 1 },
                        note: { type: Type.STRING },
                    },
                    required: ['id_order', 'quantity'],
                },
            },
        },
        required: ['details'],
    },
};

// ======================
// Estado en memoria
// ======================
let lastSnapshot: Snapshot | null = null;

// ======================
// Helpers de validación/coerción
// ======================
type AddOrderArgs = {
    id_chat: string;
    id_establishment: string;
    name: string;
    is_pickup: boolean;
    address?: string;
};

function coerceMenuId(input: string, snapshot: Snapshot): string | null {
    if (snapshot.menus_index_by_id[input]) return input; // ya es ID real
    const lower = input.trim().toLowerCase();
    const alias = lower.startsWith('menu_') ? lower.slice(5) : lower; // "MENU_nombre" -> "nombre"
    const mapped = snapshot.menus_index_by_name[alias];
    return mapped || null;
}

function validateMenuItems(snapshot: Snapshot, details: Array<any>): { ok: boolean; error?: string } {
    const productSet = new Set(Object.keys(snapshot.products_index));

    for (const d of details) {
        if (d.id_product) {
            if (!productSet.has(d.id_product)) return { ok: false, error: `Producto inexistente: ${d.id_product}` };
            continue;
        }
        if (d.id_menu) {
            const menu = snapshot.menus_index_by_id[d.id_menu];
            if (!menu) return { ok: false, error: `Menú inexistente: ${d.id_menu}` };

            const comp = menu.composition || {};
            const counts: Record<string, number> = {};
            for (const pid of d.selected_products || []) {
                const p = snapshot.products_index[pid];
                if (!p) return { ok: false, error: `Producto seleccionado no válido: ${pid}` };
                if (!menu.allowed_product_ids.includes(pid)) {
                    return { ok: false, error: `Producto no permitido en menú ${menu.name}: ${pid}` };
                }
                counts[p.category] = (counts[p.category] || 0) + 1;
            }
            for (const [cat, qty] of Object.entries(comp)) {
                if ((counts[cat] || 0) !== qty) {
                    return { ok: false, error: `Selección incompleta en "${menu.name}" para "${cat}" (esperado ${qty}).` };
                }
            }
        }
    }
    return { ok: true };
}

// ======================
// Main
// ======================
async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY no está definida en el archivo .env');
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey });

    const chat = ai.chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction: `
                                Eres el asistente de pedidos.

                                Contexto fijo:
                                - id_chat = "${idChatFromClient}"
                                - id_establishment = "${idEstablishmentFromClient}"

                                Antes de ofrecer productos o precios:
                                1) Llama a "get_establishment_snapshot" con id_establishment = "${idEstablishmentFromClient}".
                                2) Usa EXCLUSIVAMENTE IDs, composición y precios del snapshot.

                                ### Al pedir un MENÚ (muy importante):
                                - Cada menú tiene "composition" (p.ej. {"main":1,"side":1,"drink":1}) y "options_by_category".
                                - Debes PREGUNTAR por cada categoría requerida (main, side, drink, ...) hasta completar todas.
                                - Al preguntar, LISTA las opciones de esa categoría usando "options_by_category[<categoria>]" con nombre y precio.
                                - NO confirmes el menú sin recoger todas las elecciones.
                                - Cuando el usuario elija, conserva los IDs para "selected_products" respetando la composición.
                                - Para menús: NUNCA uses el nombre como id_menu (ni "MENU_<nombre>"). Usa SIEMPRE el campo "id" del menú (id_menu real de BD).

                                Flujo:
                                A) Snapshot.
                                B) Recopila y confirma.
                                C) add_order con id_chat e id_establishment fijos.
                                D) add_details_order con IDs exactos.

                                Reglas:
                                - No inventes artículos ni precios.
                                - Si is_pickup=false, pide dirección.
                                - Confirma TODO antes de procesar.
                                - Usa "add_order" y "add_details_order" para crear pedidos.

                                Política de privacidad (MUY IMPORTANTE):
                                - NUNCA muestres IDs internos (UUID de productos, menús, pedidos, id_chat, etc.) en los mensajes al cliente.
                                - Usa nombres legibles. 
                                - Confirma el pedido sin mostrar ningún identificador interno.
                            `,
            tools: [{ functionDeclarations: [getEstablishmentSnapshot, addOrder, addDetailsOrder] }],
            toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        },
    });

    // -------- DRY: un solo handler para TODAS las function calls --------
    async function handleFunctionCalls(response: any) {
        while (response.functionCalls && response.functionCalls.length > 0) {
            for (const functionCall of response.functionCalls) {
                console.log(`🔧 Ejecutando función: ${functionCall.name}`);

                if (functionCall.name === 'get_establishment_snapshot') {
                    try {
                        const snapshot = await buildSnapshot(idEstablishmentFromClient);
                        lastSnapshot = snapshot; // cachea
                        response = await chat.sendMessage({
                            message: { functionResponse: { name: functionCall.name, response: snapshot } },
                        });
                        console.log(`📦 Snapshot enviado: ${snapshot.name} (${snapshot.id_establishment}) @ ${snapshot.updated_at}\n`);
                    } catch (e) {
                        console.error('❌ Error construyendo snapshot:', e);
                        response = await chat.sendMessage({
                            message: { functionResponse: { name: functionCall.name, response: { error: 'SNAPSHOT_UNAVAILABLE' } } },
                        });
                    }
                }

                else if (functionCall.name === 'add_order') {
                    console.log('📋 add_order(args) propuestos:', JSON.stringify(functionCall.args, null, 2));

                    const rawArgs = functionCall.args as Partial<AddOrderArgs>;
                    const safeArgs = {
                        id_chat: idChatFromClient,
                        id_establishment: idEstablishmentFromClient,
                        name: rawArgs.name ?? '',
                        is_pickup: rawArgs.is_pickup ?? true,
                        address: rawArgs.address,
                    };

                    if (safeArgs.is_pickup === false && !safeArgs.address) {
                        console.warn('⚠️ Pedido a domicilio sin dirección. El asistente debe pedirla antes de continuar.');
                    }

                    // TODO: crea el pedido en tu backend y obtén id real
                    const orderId = `ORDER_${Date.now()}`;

                    response = await chat.sendMessage({
                        message: { functionResponse: { name: functionCall.name, response: { id_order: orderId } } },
                    });

                    console.log(`✅ Pedido creado | id_order=${orderId} | id_chat=${safeArgs.id_chat} | id_establishment=${safeArgs.id_establishment}\n`);
                }

                else if (functionCall.name === 'add_details_order') {
                    console.log('🍨 add_details_order(args):', JSON.stringify(functionCall.args, null, 2));

                    const args = functionCall.args as any;
                    const details = Array.isArray(args.details) ? args.details : [];

                    // Asegura snapshot
                    const snapshot = lastSnapshot ?? await buildSnapshot(idEstablishmentFromClient);
                    lastSnapshot = snapshot;

                    // Coerción de id_menu si vino mal (nombre/alias)
                    for (const d of details) {
                        if (d.id_menu && !snapshot.menus_index_by_id[d.id_menu]) {
                            const mapped = coerceMenuId(String(d.id_menu), snapshot);
                            if (mapped) {
                                console.warn(`ℹ️ Corrigiendo id_menu "${d.id_menu}" -> "${mapped}"`);
                                d.id_menu = mapped;
                            }
                        }
                    }

                    // Validación completa (existencia + composición)
                    const validation = validateMenuItems(snapshot, details);
                    if (!validation.ok) {
                        console.warn('❌ Validación fallida:', validation.error);
                        response = await chat.sendMessage({
                            message: {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: { success: false, message: validation.error },
                                },
                            },
                        });
                        continue;
                    }

                    // TODO: aquí puedes persistir los detalles en tu backend

                    response = await chat.sendMessage({
                        message: {
                            functionResponse: {
                                name: functionCall.name,
                                response: { success: true, message: 'Detalles del pedido añadidos correctamente' },
                            },
                        },
                    });

                    console.log('✅ Detalles del pedido añadidos correctamente\n');
                }
            }
        }

        if (response.text) console.log(`🤖 Asistente: ${response.text}\n`);
        return response;
    }

    // -------- Mensaje inicial (y procesar su respuesta) --------
    let initResp = await chat.sendMessage({
        message: 'Por favor, consulta el estado actual del establecimiento antes de empezar.',
    });
    if (!initResp.functionCalls || initResp.functionCalls.length === 0) {
        console.log('ℹ️ El modelo no solicitó snapshot todavía en el mensaje inicial.');
    }
    await handleFunctionCalls(initResp);

    // -------- Loop CLI con debounce --------
    let debounceTimeout: NodeJS.Timeout | null = null;
    let mensajesAcumulados: string[] = [];
    const DEBOUNCE_DELAY = 2000;

    const procesarMensajes = async () => {
        if (mensajesAcumulados.length === 0) return;
        const mensajeCompleto = mensajesAcumulados.join(' ');
        mensajesAcumulados = [];

        try {
            let response = await chat.sendMessage({ message: mensajeCompleto });
            await handleFunctionCalls(response);
        } catch (error) {
            console.error('❌ Error al procesar el mensaje:', error);
            console.log('Por favor, intenta de nuevo.\n');
        }
    };

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log('🍽️ ¡Bienvenido al Asistente de Pedidos! 🍽️');
    console.log('Escribe "salir" para terminar\n');

    try {
        while (true) {
            const userInput = await rl.question('> ');
            if (userInput.toLowerCase() === 'salir') {
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                    await procesarMensajes();
                }
                console.log('👋 ¡Hasta la vista! ¡Vuelve pronto!');
                break;
            }

            mensajesAcumulados.push(userInput);
            if (debounceTimeout) clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(async () => {
                await procesarMensajes();
                debounceTimeout = null;
            }, DEBOUNCE_DELAY);

            console.log(`⏱️  Esperando ${DEBOUNCE_DELAY / 1000}s por más mensajes...\n`);
        }
    } finally {
        rl.close();
    }
}

main().catch(console.error);
