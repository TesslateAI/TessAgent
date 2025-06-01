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
            vscode.window.showErrorMessage('Tessa Agent: API Key not configured. Please set it in the settings.');
            return undefined;
        }
        try {
            return new OpenAI({ apiKey, baseURL });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Tessa Agent: Error initializing OpenAI client: ${error.message}`);
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
        const contextWindowSize = 2000; 
        const promptText = textBeforeCursor.slice(-contextWindowSize);

        try {
            if (modelConfig.type === 'completion') {
                const response = await openai.completions.create({
                    model: modelId,
                    prompt: promptText,
                    max_tokens: 60,
                    stop: ["\n", "```"],
                    temperature: 0.3,
                });
                return response.choices[0]?.text?.trim();
            } else { 
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
            return undefined;
        }
    }

    public async getFimCompletion(prefix: string, suffix: string): Promise<string | undefined> {
        const modelId = SettingsManager.getDefaultFimModelId();
        const openai = this.getOpenAIClient(modelId);
        if (!openai) return undefined;

        const fimPrompt = `<｜fim_prefix｜>${prefix}<｜fim_suffix｜>${suffix}<｜fim_middle｜>`;

        try {
            const response = await openai.chat.completions.create({
                model: modelId,
                messages: [
                    { role: "system", content: "You are an AI that completes code. Given a prefix and a suffix, fill in the middle part. Output only the code to be inserted." },
                    { role: "user", content: fimPrompt }
                ],
                max_tokens: 250, // Increased for potentially larger FIM results
                temperature: 0.5,
                stop: ["<｜file_separator｜>", "<｜fim_prefix｜>", "<｜fim_suffix｜>"]
            });
            return response.choices[0]?.message?.content?.trim();
        } catch (error: any) {
            console.error("AI FIM Error:", error);
            vscode.window.showErrorMessage(`Tessa Agent FIM Error: ${error.message}`);
            return undefined;
        }
    }

    public async processChatMessage(
        userPrompt: string, 
        editorContext?: EditorContext,
        originalUserCommand?: string // e.g. "/update_file" if userPrompt was modified for /explain
    ): Promise<AIServiceResponse> {
        const modelId = SettingsManager.getDefaultChatModelId();
        const openai = this.getOpenAIClient(modelId);
        if (!openai) {
            return { error: "API client not initialized. Check API Key and URL settings." };
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: "You are Tessa Agent, a helpful AI assistant integrated into VS Code. Be concise and helpful. Format code snippets using markdown. Use GFM for tables if needed." }
        ];

        let effectiveUserCommand = originalUserCommand || userPrompt;

        if (editorContext?.activeEditor) {
            let contextText = `The user is currently in the file: \`${vscode.workspace.asRelativePath(editorContext.activeEditor.filePath)}\` (language: ${editorContext.activeEditor.languageId}).`;
            contextText += `\nCursor is at line ${editorContext.activeEditor.cursorPosition.line + 1}, character ${editorContext.activeEditor.cursorPosition.character + 1}.`;

            if (editorContext.activeEditor.selection.text) {
                contextText += `\nThey have selected the following text:\n\`\`\`${editorContext.activeEditor.languageId}\n${editorContext.activeEditor.selection.text}\n\`\`\``;
            } else if (editorContext.activeEditor.surroundingCode) {
                let surroundingCodeMessage = "";
                if (editorContext.activeEditor.surroundingCode.beforeCursor.trim()) {
                    surroundingCodeMessage += `\nCode before cursor:\n\`\`\`${editorContext.activeEditor.languageId}\n${editorContext.activeEditor.surroundingCode.beforeCursor}\n\`\`\``;
                }
                if (editorContext.activeEditor.surroundingCode.afterCursor.trim()) {
                     surroundingCodeMessage += `\nCode after cursor:\n\`\`\`${editorContext.activeEditor.languageId}\n${editorContext.activeEditor.surroundingCode.afterCursor}\n\`\`\``;
                }
                if (surroundingCodeMessage) {
                    contextText += "\nThe user has the following code around their cursor (no specific text selected):" + surroundingCodeMessage;
                }
            }
            messages.push({ role: "system", content: contextText });
        }
        messages.push({ role: "user", content: userPrompt });

        try {
            if (effectiveUserCommand.toLowerCase().startsWith("/update_file")) {
                if (editorContext?.activeEditor) {
                    const filePath = editorContext.activeEditor.filePath;
                    const originalContent = editorContext.activeEditor.content;
                    const instruction = effectiveUserCommand.substring("/update_file".length).trim();
                    const updatePromptForAI = `The user wants to update the file "${vscode.workspace.asRelativePath(filePath)}". Their instruction is: "${instruction}".\nBased on this instruction and the original file content provided below, generate the *entire new file content*. Output only the new file content, preferably without any surrounding markdown code blocks unless the file itself is markdown.\nOriginal content of "${vscode.workspace.asRelativePath(filePath)}":\n\`\`\`${editorContext.activeEditor.languageId}\n${originalContent}\n\`\`\``;
                    
                    // Replace the last user message (which was the /update_file command or a modified prompt)
                    // with this more specific prompt for the AI.
                    messages.pop(); 
                    messages.push({role: "user", content: updatePromptForAI});

                    const fileUpdateResponse = await openai.chat.completions.create({
                        model: modelId,
                        messages: messages,
                        max_tokens: 4000, // Allow more tokens for full file content
                        temperature: 0.5, // Slightly lower for more deterministic file updates
                    });
                    let newContent = fileUpdateResponse.choices[0]?.message?.content;
                    if (newContent) {
                        // Attempt to clean up if AI wraps in markdown unnecessarily
                        const codeBlockMatch = newContent.match(/^```(?:\w*\n)?([\s\S]*?)\n?```$/);
                        const extractedContent = codeBlockMatch ? codeBlockMatch[1] : newContent;

                        return {
                            fileUpdate: {
                                filePath: filePath,
                                newContent: extractedContent,
                                originalContent: originalContent,
                            }
                        };
                    } else {
                        return { text: "Tessa could not generate an update for the file." };
                    }
                } else {
                    return { text: "To use `/update_file`, please have a file open in the editor." };
                }
            }

            // Regular chat processing
            const response = await openai.chat.completions.create({
                model: modelId,
                messages: messages,
                max_tokens: 1500, // Increased token limit
                temperature: 0.7,
                stream: false, 
            });
            const assistantResponse = response.choices[0]?.message?.content;
            if (assistantResponse) {
                return { text: assistantResponse };
            } else {
                return { error: "Received no response from AI." };
            }
        } catch (error: any) {
            console.error("AI Chat Error:", error);
            let errorMessage = `Tessa Agent Error: ${error.message}`;
            if (error.response?.data?.error) {
                errorMessage = `AI API Error: ${error.response.data.error.message}`;
            } else if (error.message?.includes('Incorrect API key')) {
                errorMessage = 'Tessa Agent: Incorrect API Key provided. Please check your settings.';
            }
            return { error: errorMessage };
        }
    }
}