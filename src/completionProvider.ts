// src/completionProvider.ts
import * as vscode from 'vscode';
import { AIService } from './aiService';
import { SettingsManager } from './settingsManager'; // To check if completion is enabled implicitly

export class MyCompletionProvider implements vscode.InlineCompletionItemProvider {
    private aiService = new AIService();

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
        
        // Allow users to disable completion via empty model ID if they wish
        const completionModelId = SettingsManager.getDefaultCompletionModelId();
        if (!completionModelId) {
            return undefined;
        }
        
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursorInLine = lineText.substring(0, position.character);
        
        // Avoid triggering on empty lines for automatic triggers unless user explicitly invokes
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic && textBeforeCursorInLine.trim() === "") {
            return undefined;
        }
        // Avoid triggering right after common statement terminators or closing brackets if line is otherwise empty after cursor
        if (textBeforeCursorInLine.match(/[;}\]]$/) && lineText.substring(position.character).trim() === "") {
             return undefined;
        }

        // Debounce or delay slightly for automatic triggers to avoid too many requests while typing fast
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
            await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
            if (token.isCancellationRequested) return undefined;
        }


        const suggestion = await this.aiService.getCompletion(document, position);

        if (suggestion && !token.isCancellationRequested) {
            // Basic check: if the suggestion is just repeating the line's prefix, ignore it.
            const currentLinePrefix = document.lineAt(position.line).text.substring(0, position.character);
            if (suggestion.startsWith(currentLinePrefix) && suggestion.length > currentLinePrefix.length) {
                 const actualSuggestion = suggestion.substring(currentLinePrefix.length);
                 if (actualSuggestion.trim()) {
                    return [new vscode.InlineCompletionItem(actualSuggestion)];
                 }
            } else if (!currentLinePrefix.endsWith(suggestion) && suggestion.trim()) { // Avoid suggestion being part of prefix
                return [new vscode.InlineCompletionItem(suggestion)];
            }
        }
        return undefined;
    }
}