// Make sure to include the following import:
import "dotenv/config";
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const prompt = `"drink": [
                    {
                      "id": "5ff6fe20-f4e4-4e6b-b8d3-d84eb1f6fdb7",
                      "name": "Coca Cola, Lata"
                    },
                    {
                      "id": "4a3be4ac-871d-4b5a-906d-df38496b1640",
                      "name": "Coca Cola Zero, Lata"
                    },
                    {
                      "id": "091acbbc-85ed-43ee-b5db-c49b3f35409a",
                      "name": "Fanta Naranja, Lata"
                    },
                    {
                      "id": "4d72bf79-a849-4474-bdfa-8a6232d3fc40",
                      "name": "Fanta Limón, Lata"
                    },
                    {
                      "id": "ae4096a7-7969-43d2-b106-2b87b41ae5c4",
                      "name": "Pepsi Regular Refresco de Cola Lata 330ml"
                    },
                    {
                      "id": "fbec2261-8eb2-4d24-ae56-9dfd16388d5d",
                      "name": "Sprite, Lata"
                    },
                    {
                      "id": "101a1307-b5f6-4ab1-bc34-6ef1f7343d6b",
                      "name": "Aquarius Limón, Lata"
                    },
                    {
                      "id": "f6ffbb72-a224-4506-b562-2d79b667b18d",
                      "name": "Aquarius Naranja, Lata"
                    },
                    {
                      "id": "da9b6578-8507-4000-9fff-369375acfc13",
                      "name": "Agua, 1.5L"
                    }
                  ]
                }
              }`;
const promptOneLine = prompt.replace(/\s+/g, "");

let responseCountTokensResponse = await countTokensResponse(promptOneLine);
let responseGenerateResponse = await generateResponse(promptOneLine);

console.log("Prompt One Line:");
console.log(promptOneLine);

console.log("Count Tokens Response:");
console.log(responseCountTokensResponse.totalTokens);

console.log("Generate Response:");
console.log(responseGenerateResponse.usageMetadata);

responseCountTokensResponse = await countTokensResponse(prompt);
responseGenerateResponse = await generateResponse(prompt);

console.log("Prompt:");
console.log(prompt);

console.log("Count Tokens Response:");
console.log(responseCountTokensResponse.totalTokens);

console.log("Generate Response:");
console.log(responseGenerateResponse.usageMetadata);




async function generateResponse(prompt: string) {
    return await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
}

async function countTokensResponse(prompt: string) {
    return await ai.models.countTokens({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
}