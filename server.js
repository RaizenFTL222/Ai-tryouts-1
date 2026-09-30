import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is not configured.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
==================================================
YOUR AI PARAMETERS
CHANGE THESE TO CUSTOMIZE YOUR AI
==================================================
*/

const AI_SETTINGS = {
  name: "MyAI",

  model: process.env.OPENAI_MODEL || "gpt-5",

  personality:
    "You are helpful, direct, intelligent, practical, and easy to understand.",

  responseStyle:
    "Give clear answers. Use simple language. Use bullets when useful. Do not unnecessarily repeat yourself.",

  rules: [
    "Be truthful.",
    "Do not pretend to have done something you did not do.",
    "Explain complicated subjects in beginner-friendly language.",
    "Ask for clarification when necessary.",
    "Follow applicable safety requirements."
  ],

  specialInstructions:
    "Help the user accomplish legitimate goals. When giving technical instructions, provide complete working examples whenever practical."
};

function buildInstructions() {
  return `
You are ${AI_SETTINGS.name}.

PERSONALITY:
${AI_SETTINGS.personality}

RESPONSE STYLE:
${AI_SETTINGS.responseStyle}

RULES:
${AI_SETTINGS.rules.map((rule) => `- ${rule}`).join("\n")}

SPECIAL INSTRUCTIONS:
${AI_SETTINGS.specialInstructions}
`;
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/*
==================================================
HEALTH CHECK
==================================================
*/

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    ai: AI_SETTINGS.name,
    model: AI_SETTINGS.model
  });
});

/*
==================================================
AI CHAT
==================================================
*/

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "The AI API key has not been configured on the server."
      });
    }

    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "A message is required."
      });
    }

    const cleanedHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              typeof item.role === "string" &&
              typeof item.content === "string"
          )
          .slice(-20)
      : [];

    const input = [
      ...cleanedHistory.map((item) => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    const response = await openai.responses.create({
      model: AI_SETTINGS.model,
      instructions: buildInstructions(),
      input
    });

    res.json({
      reply: response.output_text || "I didn't receive a text response.",
      ai: AI_SETTINGS.name
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "The AI request failed.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
});

/*
==================================================
START SERVER
==================================================
*/

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MyAI is running on port ${PORT}`);
});
