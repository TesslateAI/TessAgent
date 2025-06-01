// src/types.ts
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    rawHtml?: boolean;
}

export interface ModelConfig {
    name: string;       // User-friendly name (e.g., "GPT-4 Turbo")
    id: string;         // Actual model ID for API (e.g., "gpt-4-turbo-preview")
    apiUrl?: string;    // Optional: specific API URL for this model
    apiKey?: string;    // Optional: specific API key for this model
    type: 'chat' | 'completion'; // Type of model endpoint
}

export interface AIServiceRequest {
    prompt: string;
    modelId?: string; // To specify which model to use
    codeContext?: string;
    filePath?: string;
    selection?: {
        text: string;
        startLine: number;
        startChar: number;
        endLine: number;
        endChar: number;
    };
    fim?: {
        prefix: string;
        suffix: string;
    };
}

export interface AIServiceResponse {
    text?: string;
    completion?: string;
    fimResult?: string;
    fileUpdate?: {
        filePath: string;
        newContent: string;
        originalContent?: string;
    };
    error?: string;
}

export interface EditorContext {
    activeEditor?: {
        filePath: string;
        content: string;
        languageId: string;
        selection: {
            text: string;
            startLine: number;
            startChar: number;
            endLine: number;
            endChar: number;
        };
        cursorPosition: {
            line: number;
            character: number;
        };
    };
}