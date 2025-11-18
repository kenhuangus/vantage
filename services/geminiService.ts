
import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { DocContent, AddressedCommentSuggestion, NewCommentSuggestion, FactCheckResult, DeepPolishResult, ImageSuggestion } from '../types';

// Ensure the API_KEY is available in the environment variables
const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY || 'mock_key' });

// Helper to safely parse JSON from LLM response
const safeParseJSON = <T>(text: string): T => {
    try {
        // Remove Markdown code blocks (```json ... ```)
        let cleanText = text.trim();
        
        // Handle cases where the model wraps output in markdown
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        
        // Handle cases where there is extra text before/after the JSON object/array
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        
        let startIndex = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            startIndex = firstBrace;
        } else if (firstBracket !== -1) {
            startIndex = firstBracket;
        }

        if (startIndex !== -1) {
            const lastBrace = cleanText.lastIndexOf('}');
            const lastBracket = cleanText.lastIndexOf(']');
            const endIndex = Math.max(lastBrace, lastBracket);
            
            if (endIndex > startIndex) {
                cleanText = cleanText.substring(startIndex, endIndex + 1);
            }
        }

        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse JSON from model output:", text);
        throw new Error("The model response was not valid JSON.");
    }
};

const addressCommentsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      originalComment: {
        type: Type.OBJECT,
        properties: {
          author: { type: Type.STRING },
          text: { type: Type.STRING },
          associatedText: { type: Type.STRING },
        },
        required: ["author", "text", "associatedText"],
      },
      suggestion: {
        type: Type.STRING,
        description: "A detailed, actionable suggestion on how to address or resolve the comment. This could be a suggested rewrite of the text, an answer to a question, or a confirmation.",
      },
    },
    required: ["originalComment", "suggestion"],
  },
};

const newCommentsSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        originalText: {
          type: Type.STRING,
          description: "The specific snippet of text from the document that the comment pertains to.",
        },
        suggestedComment: {
          type: Type.STRING,
          description: "The constructive comment to add to the document for the specified text. This should be phrased as if an editor is leaving a comment.",
        },
      },
      required: ["originalText", "suggestedComment"],
    },
};

const deepPolishSchema = {
  type: Type.OBJECT,
  properties: {
    critique: {
      type: Type.STRING,
      description: "A high-level explanation of the structural and stylistic changes made.",
    },
    rewrittenText: {
      type: Type.STRING,
      description: "The completely rewritten version of the document.",
    },
  },
  required: ["critique", "rewrittenText"],
};

const visualEnhancementSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      suggestedPrompt: {
        type: Type.STRING,
        description: "A highly detailed image generation prompt for an image that would enhance this part of the document. Describe style, subject, lighting, and composition.",
      },
      placementContext: {
        type: Type.STRING,
        description: "The specific text snippet from the document where this image should be placed next to.",
      },
      rationale: {
        type: Type.STRING,
        description: "A brief explanation of why this image adds value to the content.",
      },
    },
    required: ["suggestedPrompt", "placementContext", "rationale"],
  },
};


export const generateSuggestionsForAddressingComments = async (
  docContent: DocContent
): Promise<AddressedCommentSuggestion[]> => {
  const { fullText, comments } = docContent;

  // Basic text task - using standard flash model
  const modelId = 'gemini-2.5-flash'; 

  const prompt = `
    You are a professional editor and collaborator. Your task is to review a Google Doc and its existing comments.
    For each comment, provide a clear and actionable suggestion on how to address it.
    Your suggestions should be helpful, concise, and aimed at improving the document.

    Here is the full content of the document for context:
    --- DOCUMENT START ---
    ${fullText}
    --- DOCUMENT END ---

    Here are the comments that need to be addressed. Each comment includes the author, the comment text, and the document text it's associated with:
    --- COMMENTS START ---
    ${JSON.stringify(comments, null, 2)}
    --- COMMENTS END ---

    Please provide your suggestions in a structured JSON format.
    `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: addressCommentsSchema,
      },
    });

    const suggestions = safeParseJSON<AddressedCommentSuggestion[]>(response.text);
    
    // Add IDs for UI tracking
    return suggestions.map((s, index) => ({ ...s, id: `s-${index}`, status: 'pending' }));
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to generate suggestions for addressing comments.');
  }
};


export const generateSuggestionsForNewComments = async (
    docContent: DocContent
): Promise<NewCommentSuggestion[]> => {
    const { fullText } = docContent;
    
    // Using thinking capabilities for deeper analysis
    const modelId = 'gemini-2.5-flash'; 

    const prompt = `
        You are a meticulous and insightful editor. Your task is to conduct a thorough review of the following Google Doc.
        Your goal is to identify areas for improvement in clarity, grammar, tone, style, and substance.

        For each area of improvement you identify, you must provide a suggested comment.
        This comment should be constructive and clear, as if you were adding it directly to the document.
        You must also specify the exact text from the document that your comment applies to.

        Here is the full content of the document to review:
        --- DOCUMENT START ---
        ${fullText}
        --- DOCUMENT END ---

        Please provide your feedback as a list of suggested new comments in a structured JSON format.
        Focus on high-impact suggestions that genuinely improve the quality of the document.
        If the document is well-written and requires no comments, return an empty array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: newCommentsSchema,
              // Enable thinking for deeper critique - Increased budget for better reasoning
              thinkingConfig: { thinkingBudget: 8192 }, 
            },
          });

        const suggestions = safeParseJSON<NewCommentSuggestion[]>(response.text);
        
        // Add IDs for UI tracking
        return suggestions.map((s, index) => ({ ...s, id: `n-${index}`, status: 'pending' }));
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to generate suggestions for new comments.');
    }
};

export const verifyDocumentFacts = async (
    docContent: DocContent
): Promise<FactCheckResult> => {
    const { fullText } = docContent;
    const modelId = 'gemini-2.5-flash';

    const prompt = `
      Analyze the following document for factual claims. 
      Verify these claims against the web using Google Search.
      
      If you find any potential inaccuracies or outdated information, highlight them.
      If the information appears correct, briefly confirm it.
      Provide a summary of your findings.

      --- DOCUMENT START ---
      ${fullText}
      --- DOCUMENT END ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                // Grounding with Google Search
                tools: [{ googleSearch: {} }],
            }
        });
        
        // Extract grounding chunks and handle potential undefined properties in the SDK response
        const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const groundingChunks = rawChunks.map(chunk => ({
            web: chunk.web ? {
                uri: chunk.web.uri || '',
                title: chunk.web.title || ''
            } : undefined
        }));

        return {
            text: response.text || '',
            groundingChunks: groundingChunks
        };
    } catch (error) {
        console.error('Error calling Gemini API for Fact Check:', error);
        throw new Error('Failed to perform fact check.');
    }
}

export const generateDeepPolish = async (
  docContent: DocContent
): Promise<DeepPolishResult> => {
  const { fullText } = docContent;
  // Use Gemini 3 Pro for complex text tasks
  const modelId = 'gemini-3-pro-preview';

  const prompt = `
    You are a world-class editor and writer. 
    Your task is to completely rewrite the following document to be Professional, Concise, and Impactful.
    
    Use your deep reasoning capabilities to analyze the structure, flow, and tone. 
    Make bold changes if necessary to improve the quality.
    
    1. Provide a short critique of the original text explaining your changes.
    2. Provide the fully rewritten text.

    --- DOCUMENT START ---
    ${fullText}
    --- DOCUMENT END ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: deepPolishSchema,
        // High thinking budget for complex rewriting task
        thinkingConfig: { thinkingBudget: 16000 }, 
      },
    });

    const result = safeParseJSON<any>(response.text);
    
    return {
      originalText: fullText,
      rewrittenText: result.rewrittenText,
      critique: result.critique,
    };
  } catch (error) {
    console.error('Error calling Gemini API for Deep Polish:', error);
    throw new Error('Failed to perform deep polish.');
  }
};

export const suggestVisualEnhancements = async (
    docContent: DocContent
): Promise<ImageSuggestion[]> => {
    const { fullText } = docContent;
    // Use Gemini 3 Pro for understanding context and visual needs
    const modelId = 'gemini-3-pro-preview';

    const prompt = `
      Read the following document and identify opportunities to add visual assets (images/illustrations) that would enhance the reader's engagement and understanding.
      
      Suggest a maximum of 2 distinct image ideas.
      For each idea:
      1. Provide a highly descriptive image prompt optimized for an AI image generator.
      2. Quote the specific text from the document where this image should be placed.
      3. Explain why this image is valuable.

      --- DOCUMENT START ---
      ${fullText}
      --- DOCUMENT END ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: visualEnhancementSchema,
            }
        });
        
        const suggestions = safeParseJSON<ImageSuggestion[]>(response.text);
        // Limit to 2 just in case the model hallucinated more
        return suggestions.slice(0, 2).map((s, idx) => ({
            ...s, 
            id: `img-${idx}`,
            status: 'pending'
        }));

    } catch (error) {
        console.error("Error suggesting visuals:", error);
        throw new Error("Failed to suggest visual enhancements.");
    }
};

export const generateNanoBananaImage = async (prompt: string): Promise<string> => {
    const modelId = 'gemini-2.5-flash-image';
    
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part && part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
        throw new Error("No image data in response");
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

// New function for the "Discuss" feature
export const createDiscussionChat = (context: string) => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are a helpful writing assistant discussing specific suggestions made on a Google Doc. 
      The user wants to discuss a specific suggestion. Be concise, helpful, and conversational.
      
      CONTEXT OF THE SUGGESTION:
      ${context}
      `
    }
  });
};
