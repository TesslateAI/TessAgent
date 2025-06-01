// src/sidebarViewProvider.ts
import * as vscode from 'vscode';
import { getChatUIContent } from './chatUIManager';
import { AIService } from './aiService';
import { ChatMessage, EditorContext } from './types';
import { applyFileUpdateWithDiff } from './fileUpdater';
import { marked } from 'marked';
import { SettingsManager } from './settingsManager'; // Import SettingsManager
import { v4 as uuidv4 } from 'uuid';


export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'myAiChat.chatView';
    private _view?: vscode.WebviewView;
    private aiService = new AIService();
    private currentMessages: ChatMessage[] = [];
    private currentModelsForSelection: {label: string, id: string}[] = [];


    constructor(private readonly _extensionUri: vscode.Uri) {
        marked.setOptions({
            pedantic: false,
            gfm: true,
            breaks: false,
            xhtml: false
        });
        this.loadModelConfigurations(); // Load models on init
    }

    private loadModelConfigurations() {
        const modelConfigs = SettingsManager.getModelConfigurations();
        this.currentModelsForSelection = modelConfigs.map(mc => ({ label: mc.name, id: mc.id }));
        // If the webview is already active, send updated models
        if (this._view) {
            this._view.webview.postMessage({ command: 'setModels', models: this.currentModelsForSelection });
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'), // If you have local media
                this._extensionUri, // For general resources from extension
                vscode.Uri.file('https://fonts.googleapis.com'), // Allow Google Fonts
                vscode.Uri.file('https://fonts.gstatic.com'),
            ]
        };

        webviewView.webview.html = getChatUIContent(webviewView.webview, this._extensionUri);
        
        // Listen for configuration changes to update models
        const configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('myAiChat.modelConfigurations') || 
                e.affectsConfiguration('myAiChat.defaultChatModel')) {
                this.loadModelConfigurations();
            }
        });
        // _token.onCancellationRequested(() => { // This is for webview cancellation, not needed for config
        //     configListener.dispose();
        // });
        // TODO: How to dispose listener when webview is disposed if _token is not appropriate?
        // This might be better handled in the main extension's deactivate or if the provider itself is disposed.

        if (this.currentMessages.length === 0) {
            const welcomeMsg: ChatMessage = { id: uuidv4(), role: 'system', text: 'Welcome! Ask me anything or use `/commands`.' };
            this.currentMessages.push(welcomeMsg);
            this._view.webview.postMessage({ command: 'addMessage', role: welcomeMsg.role, text: welcomeMsg.text });
        } else {
            this.currentMessages.forEach(msg => {
                if (this._view) {
                    this._view.webview.postMessage({ command: 'addMessage', role: msg.role, text: msg.text, rawHtml: msg.rawHtml });
                }
            });
        }
        // Send current models to webview when it loads
        this._view.webview.postMessage({ command: 'setModels', models: this.currentModelsForSelection });


        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    const userMessage: ChatMessage = { id: uuidv4(), role: 'user', text: data.text };
                    this.currentMessages.push(userMessage);
                    if (this._view) {
                         this._view.webview.postMessage({ command: 'addMessage', role: 'user', text: data.text });
                    }
                    await this.handleUserMessage(data.text, data.selectedModelId); // Pass selected model
                    break;
                // case 'webviewLoaded': // If you add this message from webview
                //     if(this._view) {
                //         this._view.webview.postMessage({ command: 'setModels', models: this.currentModelsForSelection });
                //     }
                //     break;
            }
        });
    }

    private async handleUserMessage(text: string, selectedModelId?: string) {
        if (!this._view) { return; }

        const editorContext = this.getCurrentEditorContext();
        
        // Use selectedModelId if provided, otherwise fallback to default
        const modelIdToUse = selectedModelId || SettingsManager.getDefaultChatModelId();
        const aiServiceRequest = { prompt: text, modelId: modelIdToUse };

        const aiResponse = await this.aiService.processChatMessage(text, editorContext); // Pass modelId to aiService
        
        if (!this._view) { return; }
        // hideLoading is handled by the webview now

        if (aiResponse.text) {
            const renderedText = marked.parse(aiResponse.text) as string;
            const assistantMessage: ChatMessage = { id: uuidv4(), role: 'assistant', text: renderedText, rawHtml: true };
            this.currentMessages.push(assistantMessage);
            this._view.webview.postMessage({ command: 'addMessage', role: 'assistant', text: assistantMessage.text, rawHtml: true });
        }

        if (aiResponse.fileUpdate) {
            const { filePath, newContent, originalContent } = aiResponse.fileUpdate;
            const systemMessageText = `AI proposed an update for \`${vscode.workspace.asRelativePath(filePath)}\`.`;
            const systemMessage: ChatMessage = { id: uuidv4(), role: 'system', text: systemMessageText };
            this.currentMessages.push(systemMessage);
            this._view.webview.postMessage({ command: 'addMessage', role: 'system', text: systemMessage.text });
            
            if (originalContent !== undefined) {
                 await applyFileUpdateWithDiff(filePath, newContent, originalContent);
            } else {
                const apply = await vscode.window.showQuickPick(["Yes", "No"], {
                    placeHolder: `AI wants to update ${filePath}. Apply directly?`
                });
                if(apply === "Yes") {
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(newContent, 'utf8'));
                    vscode.window.showInformationMessage(`File ${vscode.workspace.asRelativePath(filePath)} updated by AI.`);
                } else {
                    vscode.window.showInformationMessage(`Update for ${filePath} cancelled by user.`);
                }
            }
        }

        if (aiResponse.error) {
            const errorMessage: ChatMessage = { id: uuidv4(), role: 'system', text: `Error: ${aiResponse.error}` };
            this.currentMessages.push(errorMessage);
            this._view.webview.postMessage({ command: 'addMessage', role: 'system', text: errorMessage.text });
        }
    }
    
    private getCurrentEditorContext(): EditorContext | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        const document = editor.document;
        const selection = editor.selection;
        const selectedText = document.getText(selection);

        return {
            activeEditor: {
                filePath: document.fileName,
                content: document.getText(),
                languageId: document.languageId,
                selection: {
                    text: selectedText,
                    startLine: selection.start.line,
                    startChar: selection.start.character,
                    endLine: selection.end.line,
                    endChar: selection.end.character,
                },
                cursorPosition: {
                    line: editor.selection.active.line,
                    character: editor.selection.active.character
                }
            }
        };
    }

    public addSystemMessageToChat(text: string) {
        if (!this._view) { return; }
        const systemMessage: ChatMessage = { id: uuidv4(), role: 'system', text };
        this.currentMessages.push(systemMessage);
        this._view.webview.postMessage({ command: 'addMessage', role: 'system', text });
    }
}