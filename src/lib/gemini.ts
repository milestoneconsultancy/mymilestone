import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_CHAIN = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash", // Extra safe fallback
];

export async function callGeminiWithFallback(
  prompt: string,
  systemInstruction?: string,
  isJson = true
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of MODEL_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction || undefined,
          generationConfig: isJson
            ? { responseMimeType: "application/json", temperature: 0.1 }
            : { temperature: 0.2 },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode || 0;
        // If 429 (Rate Limit) or 503 (Overloaded), wait 1.5s and retry once
        if ((status === 429 || status === 503 || err.message?.includes("429") || err.message?.includes("503")) && attempt === 0) {
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        // Otherwise break to next model in fallback chain
        break;
      }
    }
  }

  throw new Error(`All Gemini models in fallback chain failed: ${lastError?.message || "Unknown error"}`);
}

export async function callGeminiMultimodal(
  prompt: string,
  fileBuffer: Buffer,
  mimeType: string,
  isJson = true
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  const part = {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType,
    },
  };

  for (const modelName of MODEL_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: isJson
            ? { responseMimeType: "application/json", temperature: 0.1 }
            : { temperature: 0.2 },
        });

        const result = await model.generateContent([prompt, part]);
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode || 0;
        if ((status === 429 || status === 503 || err.message?.includes("429") || err.message?.includes("503")) && attempt === 0) {
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`All Gemini multimodal models failed: ${lastError?.message || "Unknown error"}`);
}
