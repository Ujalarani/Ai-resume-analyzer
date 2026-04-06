import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeResume = async (resumeText: string) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the following resume text and provide a structured JSON response.
    Resume Text:
    ${resumeText}
    
    The response should include:
    1. Basic Info: Name, Email, Phone, Location.
    2. Skills: A list of technical and soft skills.
    3. Keywords: Important keywords found in the resume.
    4. Predicted Job Role: Based on the skills and experience.
    5. Recommendations:
       - Skills to add: Skills that would improve the resume for the predicted role.
       - Courses/Certificates: Recommended courses or certifications.
       - Resume Tips: Specific advice to improve the resume.
    6. Overall Score: A score from 0 to 100 based on the quality of the resume.
    7. Experience Level: Junior, Mid, Senior, or Lead.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          basicInfo: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING }
            }
          },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          predictedRole: { type: Type.STRING },
          recommendations: {
            type: Type.OBJECT,
            properties: {
              skillsToAdd: { type: Type.ARRAY, items: { type: Type.STRING } },
              courses: { type: Type.ARRAY, items: { type: Type.STRING } },
              resumeTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          overallScore: { type: Type.NUMBER },
          experienceLevel: { type: Type.STRING }
        },
        required: ["basicInfo", "skills", "predictedRole", "overallScore"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
