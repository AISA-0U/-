import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const MODEL_NAME = "gemini-3.1-pro-preview";

// Tool Definitions
export const searchTool: FunctionDeclaration = {
  name: "web_search",
  description: "Search the web for real-time information, news, or specific facts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query to look up on the internet.",
      },
    },
    required: ["query"],
  },
};

export const summarizeTool: FunctionDeclaration = {
  name: "summarize_text",
  description: "Summarize a long piece of text into a concise summary.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "The full text to be summarized.",
      },
      length: {
        type: Type.STRING,
        description: "Desired length: 'short', 'medium', or 'long'.",
      },
    },
    required: ["text"],
  },
};

export const extractDataTool: FunctionDeclaration = {
  name: "extract_data",
  description: "Extract structured data (like names, dates, prices) from unstructured text.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "The text to extract data from.",
      },
      schema: {
        type: Type.STRING,
        description: "A description of the data to extract (e.g., 'list of products with prices').",
      },
    },
    required: ["text", "schema"],
  },
};

export const generateReportTool: FunctionDeclaration = {
  name: "generate_report",
  description: "Generate a report based on provided data. Supports charts and structured content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The title of the report.",
      },
      content: {
        type: Type.STRING,
        description: "The main content or findings of the report.",
      },
      dataPoints: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.NUMBER },
          },
        },
        description: "Data points for charts (optional).",
      },
    },
    required: ["title", "content"],
  },
};

export const tools = [
  { googleSearch: {} },
  { functionDeclarations: [summarizeTool, extractDataTool, generateReportTool] }
];

export default ai;
