import 'dotenv/config';
import { createInterface } from 'readline/promises';
import { FunctionCallingConfigMode, GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';

// Función para agregar helado al pedido
const agregarHeladoAlPedido: FunctionDeclaration = {
    name: 'agregar_helado_al_pedido',
    description: 'Añade un helado al pedido del cliente cuando TODA la información está completa (sabor, tamaño, envase). El cliente DEBE elegir SOLO un extra O SOLO una bebida, nunca ambos.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            sabores: {
                type: Type.ARRAY,
                description: 'Lista de sabores de helado solicitados por el cliente.',
                items: {
                    type: Type.STRING,
                    enum: ['chocolate', 'vainilla', 'fresa', 'mango', 'menta']
                }
            },
            tamano: {
                type: Type.STRING,
                description: 'Tamaño del helado.',
                enum: ['pequeño', 'mediano', 'grande']
            },
            tipoEnvase: {
                type: Type.STRING,
                description: 'El tipo de envase para el helado.',
                enum: ["vaso", "cucurucho", "tarrina"]
            },
            extra: {
                type: Type.ARRAY,
                description: 'Extra o topping adicional (NO se puede combinar con bebida).',
                items: {
                    type: Type.STRING,
                    enum: ["nata montada", "virutas de chocolate", "salsa de fresa"],
                },
            },
            bebida: {
                type: Type.OBJECT,
                description: 'Bebida que acompaña al pedido (NO se puede combinar con extra).',
                properties: {
                    id: {
                        type: Type.STRING,
                        description: 'ID de la bebida',
                        enum: ['BEB_001', 'BEB_002', 'BEB_003', 'BEB_004']
                    },
                    nombre: {
                        type: Type.STRING,
                        description: 'Nombre de la bebida',
                        enum: ['agua', 'refresco', 'zumo', 'te']
                    }
                },
                required: ['id', 'nombre'],
            }
        },
        required: ['sabores', 'tamano', 'tipoEnvase']
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
            systemInstruction: `Eres un asistente virtual de una heladería. Tu trabajo es:

                                1. Saludar amablemente y ayudar al cliente a hacer su pedido
                                2. Hacer preguntas para obtener TODA la información necesaria:
                                - Sabores disponibles: chocolate, vainilla, fresa, mango, menta
                                - Tamaños: pequeño, mediano, grande  
                                - Envases: vaso, cucurucho, tarrina
                                - OBLIGATORIO: El cliente DEBE elegir SOLO extras O SOLO una bebida (NUNCA AMBOS)
                                  * Extras: nata montada, virutas de chocolate, salsa de fresa
                                  * Bebidas disponibles:
                                        - BEB_001: agua
                                        - BEB_002: refresco
                                        - BEB_003: zumo
                                        - BEB_004: té
                                3. SOLO llamar a "agregar_helado_al_pedido" cuando tengas TODA la información completa
                                4. Preguntar si quieren algo más después de cada helado agregado

                                IMPORTANTE: 
                                - NO asumas información que el cliente no ha dado
                                - Sé conversacional y amigable
                                - Confirma los detalles antes de agregar al pedido
                                - Es OBLIGATORIO elegir extras O bebida, pero NUNCA AMBOS
                                - Si el cliente intenta elegir ambos, explícale que debe elegir solo una opción`,
            tools: [{
                functionDeclarations: [agregarHeladoAlPedido]
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
            if (response.functionCalls && response.functionCalls.length > 0) {
                for (const functionCall of response.functionCalls) {
                    if (functionCall.name === 'agregar_helado_al_pedido') {
                        console.log("Argumentos de agregar helado:", functionCall.args);
                        response = await chat.sendMessage({
                            message: {
                                functionResponse: {
                                    name: functionCall.name,
                                    response: { status: 'ok' }
                                }
                            }
                        });
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
