// src/sidebarViewProvider.ts
import * as vscode from 'vscode';
import { getChatUIContent } from './chatUIManager';
import { AIService } from './aiService';
import { ChatMessage, EditorContext } from './types';
import { applyFileUpdateWithDiff } from './fileUpdater';
import { marked } from 'marked';
import { SettingsManager } from './settingsManager';
import { v4 as uuidv4 } from 'uuid';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'myAiChat.chatView';
    private _view?: vscode.WebviewView;
    private aiService = new AIService();
    private currentMessages: ChatMessage[] = [];
    // private currentModelsForSelection: {label: string, id: string}[] = []; // Model selection in UI not implemented yet

    constructor(private readonly _extensionUri: vscode.Uri) {
        marked.setOptions({
            pedantic: false,
            gfm: true,
            breaks: false, 
            xhtml: false,
            highlight: function (code, lang) { // Corrected highlight function
                if (lang) {
                    // Apply the language class; client-side or VS Code styles will handle it.
                    // Escape the language name to be a valid CSS class name component.
                    const className = `language-${lang.replace(/[^a-zA-Z0-9_-]/g, '')}`;
                    return `<code class="${className}">${code}</code>`;
                }
                return `<code>${code}</code>`;
            }
        });
        // this.loadModelConfigurations(); // Call if model selection from chat UI is implemented
    }

    // private loadModelConfigurations() {
    //     const modelConfigs = SettingsManager.getModelConfigurations();
    //     this.currentModelsForSelection = modelConfigs.map(mc => ({ label: mc.name, id: mc.id }));
    //     if (this._view) {
    //         this._view.webview.postMessage({ command: 'setModels', models: this.currentModelsForSelection });
    //     }
    // }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'),
                this._extensionUri,
                vscode.Uri.file('https://fonts.googleapis.com'), 
                vscode.Uri.file('https://fonts.gstatic.com'),
            ]
        };

        webviewView.webview.html = getChatUIContent(webviewView.webview, this._extensionUri);
        
        // const configListener = vscode.workspace.onDidChangeConfiguration(e => {
        //     if (e.affectsConfiguration('myAiChat.modelConfigurations') || 
        //         e.affectsConfiguration('myAiChat.defaultChatModel')) {
        //         // this.loadModelConfigurations(); // If model selection UI is active
        //     }
        // });
        // _token.onCancellationRequested(() => { configListener.dispose(); });


        if (this.currentMessages.length === 0) {
            const welcomeMsg: ChatMessage = { id: uuidv4(), role: 'system', text: 'Welcome to Tessa Agent! Ask anything or use `/` for commands.' };
            this.currentMessages.push(welcomeMsg);
        }
        
        this.currentMessages.forEach(msg => {
            if (this._view) {
                this._view.webview.postMessage({ 
                    command: 'addMessage', 
                    role: msg.role, 
                    text: msg.text, 
                    rawHtml: msg.rawHtml 
                });
            }
        });
        // if (this._view) { this._view.webview.postMessage({ command: 'setModels', models: this.currentModelsForSelection });}


        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'sendMessage':
                    const userMessage: ChatMessage = { id: uuidv4(), role: 'user', text: data.text };
                    this.currentMessages.push(userMessage);
                    if (this._view) { 
                         this._view.webview.postMessage({ command: 'addMessage', role: 'user', text: data.text });
                    }
                    await this.handleUserMessage(data.text);
                    break;
                case 'refreshChat':
                    this.currentMessages = [];
                    if (this._view) {
                        this._view.webview.postMessage({ command: 'resetChat' }); 
                        const welcomeMsg: ChatMessage = { id: uuidv4(), role: 'system', text: 'Chat reset. How can I assist you?' };
                        this.currentMessages.push(welcomeMsg);
                        this._view.webview.postMessage({ command: 'addMessage', role: welcomeMsg.role, text: welcomeMsg.text });
                    }
                    break;
            }
        });
    }

    private async handleUserMessage(text: string) {
        if (!this._view) { return; }

        const editorContext = this.getCurrentEditorContext();
        
        if (text.toLowerCase().startsWith('/fim')) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                const msg = 'Please open a file editor to use /fim.';
                this.addSystemMessageToChat(msg); // Adds to currentMessages and posts to webview
                return;
            }
             const processingMsg = 'Executing Fill In Middle command...';
            this.addSystemMessageToChat(processingMsg);
            await vscode.commands.executeCommand('myAiChat.fillInMiddle');
            return;
        }

        let userPromptForAI = text;
        let isExplainCommand = false;

        if (text.toLowerCase().startsWith('/explain')) {
            isExplainCommand = true;
            let explainContext = "Explain the following";
            if (editorContext?.activeEditor?.selection?.text) {
                explainContext += ` code selection from "${vscode.workspace.asRelativePath(editorContext.activeEditor.filePath)}":\n\`\`\`${editorContext.activeEditor.languageId}\n${editorContext.activeEditor.selection.text}\n\`\`\``;
            } else if (editorContext?.activeEditor?.filePath) {
                explainContext += ` file context of "${vscode.workspace.asRelativePath(editorContext.activeEditor.filePath)}", particularly around the cursor.`;
            } else {
                 const msg = 'For /explain, please select code or have a file open.';
                 this.addSystemMessageToChat(msg);
                 return;
            }
            const userArgs = text.substring('/explain'.length).trim();
            if (userArgs) {
                explainContext += `\nUser's specific question about this context: "${userArgs}"`;
            }
            userPromptForAI = explainContext; 
        }
        
        const aiResponse = await this.aiService.processChatMessage(userPromptForAI, editorContext, isExplainCommand ? undefined : text); 
        
        if (!this._view) { return; }

        if (aiResponse.text) {
            const renderedText = marked.parse(aiResponse.text) as string;
            const assistantMessage: ChatMessage = { id: uuidv4(), role: 'assistant', text: renderedText, rawHtml: true };
            this.currentMessages.push(assistantMessage);
            this._view.webview.postMessage({ command: 'addMessage', role: 'assistant', text: assistantMessage.text, rawHtml: true });
        }

        if (aiResponse.fileUpdate) {
            const { filePath, newContent, originalContent } = aiResponse.fileUpdate;
            const systemMessageText = `AI proposed an update for \`${vscode.workspace.asRelativePath(filePath)}\`. Reviewing...`;
            this.addSystemMessageToChat(systemMessageText);
            
            await applyFileUpdateWithDiff(filePath, newContent, originalContent ?? (await vscode.workspace.fs.readFile(vscode.Uri.file(filePath))).toString());
        }

        if (aiResponse.error) {
            const errorMessageText = `Error: ${aiResponse.error}`;
            this.addSystemMessageToChat(errorMessageText);
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
        const cursorPosition = editor.selection.active;

        // Corrected type definition for surroundingCode variable
        let surroundingCode: { beforeCursor: string; afterCursor: string; } | undefined = undefined;

        if (!selectedText) { 
            const lineLimit = 30; 
            const charLimit = 1500; 

            const startLine = Math.max(0, cursorPosition.line - lineLimit);
            // Correctly get endLine for document.getText
            const endLineDoc = Math.min(document.lineCount -1 , cursorPosition.line + lineLimit);
            
            const beforeRange = new vscode.Range(new vscode.Position(startLine, 0), cursorPosition);
            let beforeText = document.getText(beforeRange);
            if (beforeText.length > charLimit) {
                beforeText = beforeText.slice(-charLimit);
            }
            
            // Ensure endCharacter is valid for the endLineDoc
            const endCharacterAfter = (endLineDoc >=0 && endLineDoc < document.lineCount) ? document.lineAt(endLineDoc).text.length : 0;
            const afterRange = new vscode.Range(cursorPosition, new vscode.Position(endLineDoc, endCharacterAfter));
            let afterText = document.getText(afterRange);
            if (afterText.length > charLimit) {
                afterText = afterText.substring(0, charLimit);
            }
            surroundingCode = { beforeCursor: beforeText, afterCursor: afterText };
        }

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
                    line: cursorPosition.line,
                    character: cursorPosition.character
                },
                surroundingCode: surroundingCode
            }
        };
    }

    public addSystemMessageToChat(text: string) {
        if (!this._view) { return; }
        const systemMessage: ChatMessage = { id: uuidv4(), role: 'system', text };
        
        const lastMessage = this.currentMessages[this.currentMessages.length -1];
        if (lastMessage && lastMessage.role === 'system' && lastMessage.text === text) {
            return; 
        }

        this.currentMessages.push(systemMessage);
        this._view.webview.postMessage({ command: 'addMessage', role: 'system', text });
    }
}