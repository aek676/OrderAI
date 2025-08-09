import "dotenv/config";
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: "Write a one-sentence bedtime story about a unicorn."
});

console.log(response.output_text);