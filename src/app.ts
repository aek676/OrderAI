// src/app.ts
import 'dotenv/config';
import { createInterface } from 'readline/promises';
import {
    FunctionCallingConfigMode,
    GoogleGenAI,
    Type,
    type FunctionDeclaration,
    type Part,
    type PartUnion,
} from '@google/genai';

import { insertDetailsOrder, insertOrder, loadHistoryRows, saveMessage } from '../utils/services/databaseRepository.js';

import { buildSnapshot, type Snapshot } from './snapshot.js';
import { rowsToGenAiHistory } from '../utils/services/history-mapping.js';
import { writeFileSync } from 'fs';

// ======================
// IDs inyectados (ENV/UI/cliente)
// ======================
const idChatFromClient = '855e9331-7bb6-434c-81e6-56d951f6116b';
const idEstablishmentFromClient = 'c7831588-4953-40c5-bdcf-02809d8a2370';

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
let currentOrderId: string | null = null;

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

    const rows = await loadHistoryRows(idChatFromClient);
    const history = rowsToGenAiHistory((rows ?? []).map(r => ({ role: r.role, parts: r.parts })));

    const chat = ai.chats.create({
        model: 'gemini-2.0-flash',
        history: history,
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
                                - No llames a "add_order" más de una vez por pedido. Si "add_details_order" falla, corrige las selecciones y vuelve a llamar a "add_details_order" para el MISMO pedido (no crees uno nuevo).
                                - Si el usuario proporciona dirección, considera que es a domicilio (is_pickup=false). Si dice "recoger", no solicites ni uses dirección.


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
            const parts: PartUnion[] = []; // ✅


            for (const functionCall of response.functionCalls) {
                console.log(`🔧 Ejecutando función: ${functionCall.name}`);

                if (functionCall.name === 'get_establishment_snapshot') {
                    await saveMessage({ id_chat: idChatFromClient, role: 'model', parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }] })
                    try {
                        const snapshot = await buildSnapshot(idEstablishmentFromClient);
                        lastSnapshot = snapshot; // cachea
                        parts.push({ functionResponse: { name: functionCall.name, response: snapshot as unknown as Record<string, unknown> } });
                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: snapshot } }] });
                        console.log(`📦 Snapshot enviado: ${snapshot.name} (${snapshot.id_establishment}) @ ${snapshot.updated_at}\n`);
                    } catch (e) {
                        console.error('❌ Error construyendo snapshot:', e);
                        parts.push({ functionResponse: { name: functionCall.name, response: { error: 'SNAPSHOT_UNAVAILABLE' } } });
                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { error: 'SNAPSHOT_UNAVAILABLE' } } }] });
                    }
                }

                else if (functionCall.name === 'add_order') {
                    await saveMessage({ id_chat: idChatFromClient, role: 'model', parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }] })
                    if (currentOrderId) {
                        console.warn('⚠️ Ya hay un pedido activo. No se puede crear otro hasta completar el actual.');
                        parts.push({ functionResponse: { name: functionCall.name, response: { id_order: currentOrderId } } });
                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { id_order: currentOrderId } } }] });
                        continue;
                    }

                    console.log('📋 add_order(args) propuestos:', JSON.stringify(functionCall.args, null, 2));

                    const rawArgs = functionCall.args as Partial<AddOrderArgs>;
                    const safeArgs: OrderData = {
                        id_chat: idChatFromClient,
                        id_establishment: idEstablishmentFromClient,
                        name: rawArgs.name ?? '',
                        is_pickup: rawArgs.is_pickup ?? true,
                        address: rawArgs.address ?? null,
                    };

                    // Normaliza/valida coherencia pickup/delivery
                    if (safeArgs.address && safeArgs.is_pickup === true) {
                        // Opción A: corriges automáticamente
                        console.warn('⚠️ is_pickup=true pero viene address. Corrigiendo a is_pickup=false (domicilio).');
                        safeArgs.is_pickup = false;
                    }
                    if (!safeArgs.is_pickup && !safeArgs.address) {
                        // Opción B: rechazas si falta dirección en delivery
                        parts.push({ functionResponse: { name: functionCall.name, response: { success: false, error: 'Falta dirección para entrega a domicilio.' } } });
                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { success: false, error: 'Falta dirección para entrega a domicilio.' } } }] });
                        continue;
                    }

                    const { data, error, status } = await insertOrder(safeArgs);

                    console.log('📝 Pedido insertado:', JSON.stringify(data, null, 2));

                    if (status !== 201) {
                        console.error('❌ Error creando pedido:', JSON.stringify(error, null, 2));
                        parts.push({ functionResponse: { name: functionCall.name, response: { success: false, error: error.message } } });
                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { success: false, error: error.message } } }] });
                        continue;
                    }

                    currentOrderId = data[0].id_order; // guarda el ID del pedido actual

                    parts.push({ functionResponse: { name: functionCall.name, response: { id_order: currentOrderId } } });
                    await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { id_order: currentOrderId } } }] });

                    console.log(`✅ Pedido creado | id_order=${currentOrderId} | id_chat=${safeArgs.id_chat} | id_establishment=${safeArgs.id_establishment}\n`);
                }
                else if (functionCall.name === 'add_details_order') {
                    await saveMessage({ id_chat: idChatFromClient, role: 'model', parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }] });
                    console.log('🍨 add_details_order(args):', JSON.stringify(functionCall.args, null, 2));

                    const args = functionCall.args as any;
                    const details = Array.isArray(args.details) ? args.details : [];

                    if (!currentOrderId) {
                        parts.push({
                            functionResponse: {
                                name: functionCall.name,
                                response: { success: false, message: 'No hay pedido abierto. Crea uno con add_order.' },
                            },
                        });

                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { success: false, message: 'No hay pedido abierto. Crea uno con add_order.' } } }] });
                        continue;
                    }
                    // Fuerza que todos los detalles apunten al pedido abierto
                    for (const d of details) d.id_order = currentOrderId;

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
                        parts.push({
                            functionResponse: {
                                name: functionCall.name,
                                response: { success: false, message: validation.error },
                            },
                        });
                        await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { success: false, message: validation.error } } }] });
                        continue;
                    }

                    // TODO: aquí puedes persistir los detalles en tu backend

                    const { data, error, status } = await insertDetailsOrder(details as DetailsOrder);

                    const resp = status !== 201
                        ? { success: false, error: error.message }
                        : { success: true, message: 'Detalles del pedido añadidos correctamente' };
                    parts.push({ functionResponse: { name: functionCall.name, response: resp } });
                    await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: resp } }] });
                    console.log('✅ Detalles del pedido añadidos correctamente\n');
                }
            }
            if (parts.length > 0) {
                response = await chat.sendMessage({ message: parts });
            } else {
                break;
            }

        }
        if (response.text) {
            console.log(`🤖 Asistente: ${response.text}\n`);
            await saveMessage({ id_chat: idChatFromClient, role: 'model', parts: [{ text: response.text }] });
        }
        return response;
    }

    // -------- Mensaje inicial (y procesar su respuesta) --------

    // Antes de enviar initResp
    const hasRecentSnapshot = history.some(msg =>
        msg.role === 'user' &&
        msg.parts?.some(p =>
            p.functionResponse?.name === 'get_establishment_snapshot'
        )
    );

    if (!hasRecentSnapshot) {
        let initResp = await chat.sendMessage({
            message: 'Por favor, consulta el estado actual del establecimiento antes de empezar.',
        });
        if (!initResp.functionCalls || initResp.functionCalls.length === 0) {
            console.log('ℹ️ El modelo no solicitó snapshot todavía en el mensaje inicial.');
        }
        await handleFunctionCalls(initResp);
    }
    // -------- Loop CLI con debounce --------
    let debounceTimeout: NodeJS.Timeout | null = null;
    let mensajesAcumulados: string[] = [];
    const DEBOUNCE_DELAY = 2000;

    const procesarMensajes = async () => {
        if (mensajesAcumulados.length === 0) return;
        const mensajeCompleto = mensajesAcumulados.join(' ');
        mensajesAcumulados = [];

        try {
            await saveMessage({ id_chat: idChatFromClient, role: 'user', parts: [{ text: mensajeCompleto }] });
            let response = await chat.sendMessage({ message: mensajeCompleto });
            await handleFunctionCalls(response);
        } catch (error) {
            console.error('❌ Error al procesar el mensaje:', error);
            console.log('Por favor, intenta de nuevo.\n');
            await chat.sendMessage({
                message: { text: 'Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.' },
            });
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
                const history = chat.getHistory(true);
                writeFileSync('historial_chat_curated.json', JSON.stringify(history, null, 2), 'utf-8');
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
