import 'dotenv/config';
import { createInterface } from 'readline/promises';
import { FunctionCallingConfigMode, GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { type OrdersTable } from './types/orders.js';

const addOrder: FunctionDeclaration = {
    name: 'add_order',
    description: 'Añade un nuevo pedido al sistema.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            id_chat: {
                type: Type.STRING,
                description: 'ID del chat asociado al pedido.'
            },
            id_establishent: {
                type: Type.STRING,
                description: 'ID del establecimiento donde se realiza el pedido.'
            },
            name: {
                type: Type.STRING,
                description: 'Nombre del cliente que realiza el pedido.'
            },
            is_pickup: {
                type: Type.BOOLEAN,
                description: 'Indica si el pedido es para recoger en el local (true) o para entrega a domicilio (false).'
            },
            address: {
                type: Type.STRING,
                description: 'Dirección de entrega del pedido. Solo es requerida si is_pickup es false.'
            },
        },
        required: ['id_chat', 'id_establishent', 'is_pickup', 'name']
    }
};

const addDetailsOrder: FunctionDeclaration = {
    name: 'add_details_order',
    description: 'Añade detalles específicos de un pedido que puede ser un producto o un menú.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            details: {
                type: Type.ARRAY,
                description: 'Lista de detalles del pedido.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id_order: {
                            type: Type.STRING,
                            description: 'ID del pedido al que se añaden los detalles.'
                        },
                        id_product: {
                            type: Type.STRING,
                            description: 'ID del producto (requerido si no es menú).'
                        },
                        id_menu: {
                            type: Type.STRING,
                            description: 'ID del menú (requerido si no es producto).'
                        },
                        selected_products: {
                            type: Type.ARRAY,
                            description: 'Array de IDs de productos seleccionados del menú.',
                            items: {
                                type: Type.STRING,
                                description: 'ID del producto seleccionado.'
                            }
                        },
                        quantity: {
                            type: Type.INTEGER,
                            description: 'Cantidad de elementos.',
                            minimum: 1
                        },
                        note: {
                            type: Type.STRING,
                            description: 'Nota adicional opcional.'
                        }
                    },
                    required: ['id_order', 'quantity']
                }
            }
        },
        required: ['details']
    }
};


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
            systemInstruction: `Eres un asistente virtual de la Heladería "Dulce Frío". Tu trabajo es:

                                1. SALUDAR amablemente y ayudar al cliente a realizar su pedido completo
                                2. RECOPILAR toda la información del cliente y sus productos/menús
                                3. PROCESAR el pedido al final usando las funciones correctas

                                📋 PRODUCTOS DISPONIBLES:
                                - PROD_001: Helado 1 Sabor (pequeño) - €3.50
                                - PROD_002: Helado 1 Sabor (mediano) - €4.50  
                                - PROD_003: Helado 1 Sabor (grande) - €5.50
                                - PROD_004: Helado 2 Sabores (pequeño) - €4.00
                                - PROD_005: Helado 2 Sabores (mediano) - €5.00
                                - PROD_006: Helado 2 Sabores (grande) - €6.00
                                - PROD_007: Helado 3 Sabores (pequeño) - €4.50
                                - PROD_008: Helado 3 Sabores (mediano) - €5.50
                                - PROD_009: Helado 3 Sabores (grande) - €6.50
                                - PROD_010: Batido de Fresa - €3.00
                                - PROD_011: Batido de Chocolate - €3.00
                                - PROD_012: Batido de Vainilla - €3.00

                                🍨 MENÚS DISPONIBLES:
                                - MENU_001: Combo Dulce (Helado mediano + bebida + extra) - €7.50
                                * Incluye: 1 helado mediano a elegir + 1 bebida + 1 extra
                                - MENU_002: Combo Familiar (2 helados grandes + 2 bebidas) - €13.00  
                                * Incluye: 2 helados grandes a elegir + 2 bebidas
                                - MENU_003: Combo Infantil (Helado pequeño + zumo + sorpresa) - €5.50
                                * Incluye: 1 helado pequeño + zumo + juguete sorpresa

                                🎨 SABORES: chocolate, vainilla, fresa, mango, menta, pistacho, coco
                                📦 ENVASES: vaso, cucurucho, tarrina  
                                🎯 EXTRAS: nata montada, virutas de chocolate, salsa de fresa, nueces, caramelo
                                🥤 BEBIDAS: 
                                - BEB_001: Agua - €1.00
                                - BEB_002: Refresco - €2.00  
                                - BEB_003: Zumo - €2.50
                                - BEB_004: Té - €1.50

                                💡 PROCESO DE PEDIDO:
                                1. Pregunta qué quiere el cliente (productos individuales o menús)
                                2. Recopila TODOS los detalles de cada producto/menú
                                3. Para productos: sabores, tamaño, envase, extras/bebidas
                                4. Para menús: qué productos específicos quiere dentro del menú
                                5. Pregunta datos del cliente: nombre, si es recogida o entrega, dirección si es entrega
                                6. CONFIRMA todo el pedido antes de procesarlo
                                7. Llama a "add_order" primero con los datos del cliente
                                8. Luego llama a "add_details_order" con todos los productos/menús

                                ⚠️ REGLAS IMPORTANTES:
                                - Establece siempre id_establishent como "HELADERIA_001"  
                                - Usa un id_chat único (puedes usar timestamp)
                                - Para productos individuales: usa id_product y NO id_menu
                                - Para menús: usa id_menu y selected_products con los IDs específicos elegidos
                                - NO proceses el pedido hasta tener TODA la información
                                - Sé amigable y paciente, no asumas información
                                - Confirma siempre antes de procesar`,
            tools: [{
                functionDeclarations: [addOrder, addDetailsOrder]
            }],
            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingConfigMode.AUTO
                }
            }
        }
    });

    let debounceTimeout: NodeJS.Timeout | null = null;
    let mensajesAcumulados: string[] = [];
    const DEBOUNCE_DELAY = 2000;

    const procesarMensajes = async () => {
        if (mensajesAcumulados.length === 0) return;

        const mensajeCompleto = mensajesAcumulados.join(' ');
        mensajesAcumulados = [];

        // console.log(`🔄 Procesando: "${mensajeCompleto}"\n`);

        try {
            let response = await chat.sendMessage({ message: mensajeCompleto });

            // Procesar todas las function calls que puedan venir
            while (response.functionCalls && response.functionCalls.length > 0) {
                for (const functionCall of response.functionCalls) {
                    console.log(`🔧 Ejecutando función: ${functionCall.name}`);

                    if (functionCall.name === 'add_order') {
                        console.log("📋 Argumentos de add_order:", JSON.stringify(functionCall.args, null, 2));

                        const orderId = `ORDER_${Date.now()}`;

                        response = await chat.sendMessage({
                            message: {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: { id_order: orderId }
                                }
                            }
                        });

                        console.log(`✅ Pedido creado con ID: ${orderId}\n`);

                    } else if (functionCall.name === 'add_details_order') {
                        console.log("🍨 Argumentos de add_details_order:", JSON.stringify(functionCall.args, null, 2));
                        response = await chat.sendMessage({
                            message: {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: {
                                        success: true,
                                        message: "Detalles del pedido añadidos correctamente"
                                    }
                                }
                            }
                        });

                        console.log("✅ Detalles del pedido añadidos correctamente\n");
                    }
                }
            }

            if (response.text) {
                console.log(`🤖 Asistente: ${response.text}\n`);
            }
        } catch (error) {
            console.error('❌ Error al procesar el mensaje:', error);
            console.log('Por favor, intenta de nuevo.\n');
        }
    }

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('🍦 ¡Bienvenido a la Heladería Virtual! 🍦');
    console.log('Escribe "salir" para terminar\n');

    try {
        whileLoop: while (true) {
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

            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }

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
