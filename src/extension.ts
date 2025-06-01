// src/extension.ts
import * as vscode from 'vscode';
import { ChatViewProvider } from './sidebarViewProvider';
import { MyCompletionProvider } from './completionProvider';
import { AIService } from './aiService';
import { SettingsManager } from './settingsManager'; 

let chatViewProviderInstance: ChatViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Tessa Agent extension is now active!');

    // Initial API key check
    if (!SettingsManager.getGlobalApiKey() && SettingsManager.getModelConfigurations().every(m => !m.apiKey)) {
        vscode.window.showWarningMessage(
            'Tessa Agent: API Key is not set. Please configure it in VS Code settings (search "Tessa Agent") for the extension to work.',
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

    // Register FIM Command (can be triggered from palette or via /fim in chat)
    const fimCommand = vscode.commands.registerCommand('myAiChat.fillInMiddle', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a file to use Fill In Middle.');
            return;
        }

        const document = editor.document;
        const position = editor.selection.active; // Use current cursor position for FIM
        
        const MAX_CONTEXT_CHARS_FIM = 3500; // Limit context size for FIM prefix/suffix
        let prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let suffix = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).text.length)));

        if (prefix.length > MAX_CONTEXT_CHARS_FIM) {
            prefix = prefix.slice(-MAX_CONTEXT_CHARS_FIM);
        }
        if (suffix.length > MAX_CONTEXT_CHARS_FIM) {
            suffix = suffix.substring(0, MAX_CONTEXT_CHARS_FIM);
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Tessa Agent is filling in the middle...",
            cancellable: false 
        }, async () => {
            const aiService = new AIService();
            const fimResult = await aiService.getFimCompletion(prefix, suffix);

            if (fimResult) {
                await editor.edit(editBuilder => {
                    editBuilder.insert(position, fimResult);
                });
                if (chatViewProviderInstance) {
                    chatViewProviderInstance.addSystemMessageToChat(
                        `Fill In Middle action completed for \`${vscode.workspace.asRelativePath(editor.document.fileName)}\` at line ${position.line + 1}.`
                    );
                }
            } else {
                vscode.window.showErrorMessage('Tessa Agent could not fill in the middle for the current context.');
                 if (chatViewProviderInstance) {
                    chatViewProviderInstance.addSystemMessageToChat(
                        `Fill In Middle action failed for \`${vscode.workspace.asRelativePath(editor.document.fileName)}\`.`
                    );
                }
            }
        });
    });
    context.subscriptions.push(fimCommand);

    // Command to open settings
    const openSettingsCommand = vscode.commands.registerCommand('myAiChat.openSettingsPage', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:' + context.extension.id);
    });
    context.subscriptions.push(openSettingsCommand);
}

export function deactivate() {
    console.log('Tessa Agent extension deactivated.');
}