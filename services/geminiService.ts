import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIVerificationResult } from "../types";

// In a real app, this key comes from process.env.API_KEY. 
// Ideally, the backend proxies this request to hide the key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const verificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    extractedName: { type: Type.STRING, description: "Name of the student found in the letter" },
    extractedReason: { type: Type.STRING, description: "The reason for permission request" },
    hasSignature: { type: Type.BOOLEAN, description: "True if a handwritten signature or stamp is detected" },
    riskScore: { type: Type.NUMBER, description: "Risk score from 0 (safe) to 100 (suspicious)" },
    summary: { type: Type.STRING, description: "Brief summary of the request for the teacher" },
    isLegitimate: { type: Type.BOOLEAN, description: "Overall assessment of validity" }
  },
  required: ["extractedName", "extractedReason", "hasSignature", "riskScore", "summary", "isLegitimate"]
};

export const analyzePermissionLetter = async (imageBase64: string): Promise<AIVerificationResult> => {
  try {
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

    const model = "gemini-2.5-flash"; // Multimodal model good for text + image

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: `Analyze this permission letter image. 
            Identify the student name, reason for permission, and check for a signature/stamp. 
            Assess if it looks like a legitimate official document or a handwritten note. 
            Provide a risk score (0-100) where 100 is very suspicious (e.g., no signature, messy, inconsistent).`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: verificationSchema,
        systemInstruction: "You are a strict document verification AI for a college. Analyze permission letters for authenticity."
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIVerificationResult;
    }
    
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback for demo if API fails or key is missing
    return {
      extractedName: "Unknown",
      extractedReason: "Could not analyze",
      hasSignature: false,
      riskScore: 0,
      summary: "AI analysis failed. Please verify manually.",
      isLegitimate: false
    };
  }
};