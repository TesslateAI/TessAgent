// src/aiService.ts
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { AIServiceResponse, EditorContext } from './types';
import { SettingsManager } from './settingsManager';

export class AIService {
    private getOpenAIClient(modelIdUsed: string): OpenAI | undefined {
        const apiKey = SettingsManager.getApiKey(modelIdUsed);
        const baseURL = SettingsManager.getApiUrl(modelIdUsed);

        if (!apiKey) {
            vscode.window.showErrorMessage('My AI Chat: API Key not configured. Please set it in the settings.');
            return undefined;
        }
        try {
            return new OpenAI({ apiKey, baseURL });
        } catch (error: any) {
            vscode.window.showErrorMessage(`My AI Chat: Error initializing OpenAI client: ${error.message}`);
            console.error("OpenAI client init error:", error);
            return undefined;
        }
    }

    public async getCompletion(document: vscode.TextDocument, position: vscode.Position): Promise<string | undefined> {
        const modelId = SettingsManager.getDefaultCompletionModelId();
        const modelConfig = SettingsManager.getModelConfigById(modelId);
        const openai = this.getOpenAIClient(modelId);
        if (!openai || !modelConfig) {
            return undefined;
        }

        const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        // Limit context to prevent very large requests for simple completions
        const contextWindowSize = 2000; // characters
        const promptText = textBeforeCursor.slice(-contextWindowSize);

        try {
            if (modelConfig.type === 'completion') {
                const response = await openai.completions.create({
                    model: modelId,
                    prompt: promptText,
                    max_tokens: 60,
                    stop: ["\n", "```"], // Stop at newline or new code block for inline
                    temperature: 0.3,
                });
                return response.choices[0]?.text?.trim();
            } else { // Use chat model for completion
                const response = await openai.chat.completions.create({
                    model: modelId,
                    messages: [
                        { role: "system", content: "You are a helpful AI code assistant providing inline code completions. Complete the user's code. Provide only the completion text itself, without any prefix or explanation." },
                        { role: "user", content: `Complete the following code:\n\`\`\`\n${promptText}\n\`\`\`` } 
                    ],
                    max_tokens: 60,
                    stop: ["\n", "```"],
                    temperature: 0.3,
                });
                return response.choices[0]?.message?.content?.trim();
            }
        } catch (error: any) {
            console.error("AI Completion Error:", error);
            // Don't show error message for every completion failure, can be noisy. Log it.
            // vscode.window.showErrorMessage(`My AI Chat Completion Error: ${error.message}`);
            return undefined;
        }
    }

    public async getFimCompletion(prefix: string, suffix: string): Promise<string | undefined> {
        const modelId = SettingsManager.getDefaultFimModelId();
        const openai = this.getOpenAIClient(modelId);
        if (!openai) return undefined;

        // Constructing FIM prompt for chat models (OpenAI doesn't have a dedicated FIM endpoint for all models)
        // Using a common FIM marker style. Adjust if your model needs specific markers.
        const fimPrompt = `<｜fim_prefix｜>${prefix}<｜fim_suffix｜>${suffix}<｜fim_middle｜>`;

        try {
            const response = await openai.chat.completions.create({
                model: modelId,
                messages: [
                    { role: "system", content: "You are an AI that completes code. Given a prefix and a suffix, fill in the middle part. Output only the code to be inserted." },
                    { role: "user", content: fimPrompt }
                ],
                max_tokens: 150,
                temperature: 0.5,
                stop: ["<｜file_separator｜>", "<｜fim_prefix｜>", "<｜fim_suffix｜>"] // Stop tokens for FIM
            });
            return response.choices[0]?.message?.content?.trim();
        } catch (error: any) {
            console.error("AI FIM Error:", error);
            vscode.window.showErrorMessage(`My AI Chat FIM Error: ${error.message}`);
            return undefined;
        }
    }

    public async processChatMessage(message: string, editorContext?: EditorContext): Promise<AIServiceResponse> {
        const modelId = SettingsManager.getDefaultChatModelId();
        const openai = this.getOpenAIClient(modelId);
        if (!openai) {
            return { error: "API client not initialized. Check API Key and URL settings." };
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: "You are a helpful AI assistant integrated into a VS Code extension. Be concise and helpful. Format code snippets using markdown." }
        ];

        if (editorContext?.activeEditor) {
            let contextText = `The user is currently in the file: \`${editorContext.activeEditor.filePath}\` (language: ${editorContext.activeEditor.languageId}).`;
            if (editorContext.activeEditor.selection.text) {
                contextText += `\nThey have selected the following text:\n\`\`\`${editorContext.activeEditor.languageId}\n${editorContext.activeEditor.selection.text}\n\`\`\``;
            }
            messages.push({ role: "system", content: contextText });
        }
        messages.push({ role: "user", content: message });

        try {
            // Simulate a command for file update
            if (message.toLowerCase().startsWith("/update_file")) {
                if (editorContext?.activeEditor) {
                    const filePath = editorContext.activeEditor.filePath;
                    const originalContent = editorContext.activeEditor.content;
                    // Ask AI to generate the new content based on the original and the prompt
                    const updatePrompt = `Given the following file content for "${filePath}" and the user's request, provide the *entire new file content*. User request: "${message.substring("/update_file".length).trim()}". Original content:\n\`\`\`${editorContext.activeEditor.languageId}\n${originalContent}\n\`\`\``;
                    
                    messages.pop(); // Remove the original /update_file message
                    messages.push({role: "user", content: updatePrompt});

                    const fileUpdateResponse = await openai.chat.completions.create({
                        model: modelId,
                        messages: messages,
                        max_tokens: 2000, // Allow more tokens for full file content
                        temperature: 0.6,
                    });
                    const newContent = fileUpdateResponse.choices[0]?.message?.content;
                    if (newContent) {
                        // Extract code if AI wraps it in markdown
                        const codeBlockMatch = newContent.match(/```(?:\w*\n)?([\s\S]*?)```/);
                        const extractedContent = codeBlockMatch ? codeBlockMatch[1] : newContent;

                        return {
                            fileUpdate: {
                                filePath: filePath,
                                newContent: extractedContent,
                                originalContent: originalContent,
                            }
                        };
                    } else {
                        return { text: "AI could not generate an update for the file." };
                    }
                } else {
                    return { text: "To use `/update_file`, please have a file open in the editor." };
                }
            }

            // Regular chat processing
            const response = await openai.chat.completions.create({
                model: modelId,
                messages: messages,
                max_tokens: 1024,
                temperature: 0.7,
                stream: false, // For simplicity, not streaming yet. Streaming would require more complex handling.
            });
            const assistantResponse = response.choices[0]?.message?.content;
            if (assistantResponse) {
                return { text: assistantResponse };
            } else {
                return { error: "Received no response from AI." };
            }
        } catch (error: any) {
            console.error("AI Chat Error:", error);
            let errorMessage = `My AI Chat Error: ${error.message}`;
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage = `AI API Error: ${error.response.data.error.message}`;
            } else if (error.message && error.message.includes('Incorrect API key')) {
                errorMessage = 'My AI Chat: Incorrect API Key provided. Please check your settings.';
            }
            return { error: errorMessage };
        }
    }
}