
export interface User {
  name: string;
  email: string;
  avatarUrl: string;
  accessToken?: string;
}

export interface GoogleDoc {
  id: string;
  name: string;
  lastModified: string;
  preview?: string;
}

export interface DocComment {
  id: string;
  author: string;
  text: string;
  associatedText: string;
}

export interface DocContent {
  fullText: string;
  comments: DocComment[];
}

export interface AddressedCommentSuggestion {
  id?: string;
  status?: 'pending' | 'accepted' | 'dismissed';
  originalComment: {
    author: string;
    text: string;
    associatedText: string;
  };
  suggestion: string;
}

export interface NewCommentSuggestion {
  id?: string;
  status?: 'pending' | 'accepted' | 'dismissed';
  originalText: string;
  suggestedComment: string;
}

export interface FactCheckResult {
  text: string;
  groundingChunks: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
}

export interface DeepPolishResult {
  originalText: string;
  rewrittenText: string;
  critique: string;
}

export interface ImageSuggestion {
  id?: string;
  suggestedPrompt: string;
  placementContext: string;
  rationale: string;
  imageData?: string; // Base64
  status: 'pending' | 'loading' | 'generated' | 'error';
}

export enum ReviewMode {
  AddressComments,
  AddNewComments,
  FactCheck,
  DeepPolish,
  VisualEnhancements,
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
