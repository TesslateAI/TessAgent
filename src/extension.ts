// src/extension.ts
import * as vscode from 'vscode';
import { ChatViewProvider } from './sidebarViewProvider';
import { MyCompletionProvider } from './completionProvider';
import { AIService } from './aiService';
// SettingsManager is not directly used here but its existence is important for other modules
// import { SettingsManager } from './settingsManager'; 

let chatViewProviderInstance: ChatViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('My AI Chat extension is now active!');

    // Check if API key is set, if not, prompt user.
    const apiKey = vscode.workspace.getConfiguration('myAiChat').get<string>('apiKey');
    if (!apiKey) {
        vscode.window.showWarningMessage(
            'My AI Chat: OpenAI API Key is not set. Please configure it in settings for the extension to work.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'myAiChat.apiKey');
            }
        });
    }


    // Register Sidebar Webview Provider
    chatViewProviderInstance = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProviderInstance, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Register Code Completion Provider
    const completionProvider = new MyCompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, completionProvider)
    );

    // Register FIM Command
    const fimCommand = vscode.commands.registerCommand('myAiChat.fillInMiddle', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a file to use Fill In Middle.');
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        
        // More robust way to get prefix and suffix for FIM
        // For this example, let's consider up to N lines before and after current line
        // Or a simpler approach: everything before cursor, everything after cursor in the document
        const MAX_CONTEXT_CHARS = 4000; // Limit context size
        let prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let suffix = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, 0)));

        if (prefix.length > MAX_CONTEXT_CHARS) {
            prefix = prefix.slice(-MAX_CONTEXT_CHARS);
        }
        if (suffix.length > MAX_CONTEXT_CHARS) {
            suffix = suffix.substring(0, MAX_CONTEXT_CHARS);
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AI is filling in the middle...",
            cancellable: false // True if you want to allow cancellation, need to handle CancellationToken
        }, async (progress) => {
            const aiService = new AIService();
            const fimResult = await aiService.getFimCompletion(prefix, suffix);

            if (fimResult) {
                await editor.edit(editBuilder => {
                    editBuilder.insert(position, fimResult);
                });
                // vscode.window.showInformationMessage('AI filled in the middle!');
                if (chatViewProviderInstance) {
                    chatViewProviderInstance.addSystemMessageToChat(
                        `Fill In Middle action completed for \`${vscode.workspace.asRelativePath(editor.document.fileName)}\` at line ${position.line + 1}.`
                    );
                }
            } else {
                vscode.window.showErrorMessage('AI could not fill in the middle for the current context.');
                 if (chatViewProviderInstance) {
                    chatViewProviderInstance.addSystemMessageToChat(
                        `Fill In Middle action failed for \`${vscode.workspace.asRelativePath(editor.document.fileName)}\`.`
                    );
                }
            }
        });
    });
    context.subscriptions.push(fimCommand);

    // Command to open settings (useful if user needs to be guided)
    const openSettingsCommand = vscode.commands.registerCommand('myAiChat.openSettingsPage', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'myAiChat');
    });
    context.subscriptions.push(openSettingsCommand);
}

export function deactivate() {
    console.log('My AI Chat extension deactivated.');
}