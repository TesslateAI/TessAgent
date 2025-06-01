// src/completionProvider.ts
import * as vscode from 'vscode';
import { AIService } from './aiService';

export class MyCompletionProvider implements vscode.InlineCompletionItemProvider {
    private aiService = new AIService();

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
        
        // Basic check to avoid completing inside comments or strings
        // More robust tokenization/parsing would be needed for perfect accuracy
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        const charBeforeCursor = textBeforeCursor.length > 0 ? textBeforeCursor[textBeforeCursor.length - 1] : '';
        
        // Skip if cursor is not at the end of a word or after whitespace/punctuation
        // that typically precedes a new statement or expression part.
        if (charBeforeCursor.match(/\w/)) { // if last char is a word char, likely mid-word
            // This is a very simple heuristic. A more robust solution would involve
            // checking the language's syntax or using language server features.
            // For now, we allow completion if it's mid-word to see what the AI does.
        }

        // Avoid triggering completion when it's likely not desired (e.g. after a semicolon or closing bracket on its own)
        if (textBeforeCursor.match(/[;}\]]$/) && lineText.substring(position.character).trim() === "") {
             return undefined;
        }
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic && textBeforeCursor.trim() === "") {
            // Don't auto-trigger on empty lines, wait for manual invocation or more context
            return undefined;
        }


        const suggestion = await this.aiService.getCompletion(document, position);

        if (suggestion && !token.isCancellationRequested) {
            // Ensure the suggestion does not just repeat the line prefix if that's all the AI returned
            if (textBeforeCursor.endsWith(suggestion)) {
                return undefined;
            }
            const item = new vscode.InlineCompletionItem(suggestion);
            return [item];
        }
        return undefined;
    }
}