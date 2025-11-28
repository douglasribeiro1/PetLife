import { GoogleGenAI } from "@google/genai";
import { Pet, MedicalRecord } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeHealthHistory = async (pet: Pet, records: MedicalRecord[]): Promise<string> => {
  try {
    const ai = getAIClient();
    
    // Format data for the prompt
    const petInfo = `Pet: ${pet.name}, Espécie: ${pet.species}, Raça: ${pet.breed}, Nasc: ${pet.birthDate}`;
    const recordList = records.map(r => 
      `- [${r.date}] ${r.type}: ${r.title} (${r.description}). ${r.nextDueDate ? `Próximo: ${r.nextDueDate}` : ''}`
    ).join('\n');

    const prompt = `
      Atue como um assistente veterinário experiente. Analise o histórico médico abaixo.
      
      Dados do Pet:
      ${petInfo}
      
      Histórico:
      ${recordList.length > 0 ? recordList : "Nenhum registro encontrado."}
      
      Por favor, forneça:
      1. Um breve resumo da saúde do pet.
      2. Lembretes importantes baseados nas datas (vacinas vencidas, etc).
      3. Sugestões gerais de cuidados para esta raça/espécie.
      
      Responda em português, de forma amigável e concisa (máximo 3 parágrafos).
      Use formatação Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA. Verifique sua conexão ou tente novamente mais tarde.";
  }
};