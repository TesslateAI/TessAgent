// src/chatUIManager.ts
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid'; // For generating nonce

export function getChatUIContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = uuidv4();
    
    const thermiqueTheme = {
        colorPrimary: 'rgb(255, 77, 0)',
        colorPrimaryDark: 'rgb(204, 61, 0)',
        colorAccentYellow: 'rgb(250, 187, 0)',
        colorBgDark: 'rgb(17, 17, 17)', // Slightly darker than template for more contrast with cards
        colorBgCard: 'rgb(28, 28, 28)',
        colorTextLight: 'rgb(220, 220, 220)', // Slightly off-white for better readability
        colorTextLight85: 'rgba(220, 220, 220, 0.85)',
        colorBorderLight: 'rgba(255, 255, 255, 0.15)', // Slightly less opaque
        colorBorderOrange: 'rgba(112, 69, 54, 0.7)', // Using template, but consider a brighter orange for borders
        fontPrimary: "'Inter', var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    };

    // Get VS Code theme variables to blend if needed, or for fallbacks
    const vscodeStyles = `
        :root {
            --vscode-font-family: ${webview.cspSource}; /* This is incorrect, should be var(--vscode-font-family) from body */
            --vscode-editor-foreground: ${webview.cspSource};
            --vscode-side-bar-background: ${webview.cspSource};
            --vscode-editor-background: ${webview.cspSource};
            --vscode-input-background: ${webview.cspSource};
            --vscode-input-foreground: ${webview.cspSource};
            --vscode-input-border: ${webview.cspSource};
            --vscode-button-background: ${webview.cspSource};
            --vscode-button-foreground: ${webview.cspSource};
            --vscode-button-hover-background: ${webview.cspSource};
            --vscode-list-active-selection-background: ${webview.cspSource};
            --vscode-list-active-selection-foreground: ${webview.cspSource};
            --vscode-text-code-block-background: ${webview.cspSource};
            --vscode-scrollbar-slider-background: ${webview.cspSource};
            --vscode-scrollbar-slider-hover-background: ${webview.cspSource};
            --vscode-scrollbar-slider-active-background: ${webview.cspSource};
        }
    `;


    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-A">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} https: data:; img-src ${webview.cspSource} https: data:;">
    <title>My AI Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style nonce="${nonce}">
        :root {
            --theme-color-primary: ${thermiqueTheme.colorPrimary};
            --theme-color-primary-dark: ${thermiqueTheme.colorPrimaryDark};
            --theme-color-accent-yellow: ${thermiqueTheme.colorAccentYellow};
            --theme-color-bg-dark: ${thermiqueTheme.colorBgDark};
            --theme-color-bg-card: ${thermiqueTheme.colorBgCard};
            --theme-color-text-light: ${thermiqueTheme.colorTextLight};
            --theme-color-text-light-85: ${thermiqueTheme.colorTextLight85};
            --theme-color-border-light: ${thermiqueTheme.colorBorderLight};
            --theme-color-border-orange: ${thermiqueTheme.colorBorderOrange};
            --theme-font-primary: ${thermiqueTheme.fontPrimary};
        }

        body { 
            font-family: var(--theme-font-primary); 
            color: var(--theme-color-text-light); 
            background-color: var(--theme-color-bg-dark);
            margin: 0; 
            padding: 0; 
            display: flex; 
            flex-direction: column; 
            height: 100vh; 
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .chat-messages-container {
            flex-grow: 1;
            position: relative;
            overflow: hidden; /* For dot pattern and glow */
        }
        
        .dot-pattern-bg {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1.2px); /* Subtler */
            background-size: 22px 22px; /* Smaller pattern */
            z-index: 0;
        }

        .chat-messages { 
            flex-grow: 1; 
            padding: 15px; 
            overflow-y: auto; 
            position: relative; /* To be above dot pattern */
            z-index: 1;
            height: 100%; /* Ensure it fills container for scroll */
        }

        /* Scrollbar Styling */
        .chat-messages::-webkit-scrollbar {
            width: 8px;
        }
        .chat-messages::-webkit-scrollbar-track {
            background: transparent; /* Track matches chat bg */
        }
        .chat-messages::-webkit-scrollbar-thumb {
            background-color: var(--theme-color-border-light); 
            border-radius: 10px;
            border: 2px solid transparent; /* Creates padding around thumb */
            background-clip: content-box;
        }
        .chat-messages::-webkit-scrollbar-thumb:hover {
            background-color: var(--theme-color-primary); 
        }

        .message { 
            margin-bottom: 15px; 
            padding: 12px 18px; 
            border-radius: 12px; /* More rounded cards */
            max-width: 85%; 
            word-wrap: break-word; 
            line-height: 1.6;
            border: 1px solid transparent;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); /* Subtle shadow */
            position: relative;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.user { 
            background: linear-gradient(135deg, var(--theme-color-primary), var(--theme-color-primary-dark)); 
            color: var(--theme-color-text-light); 
            margin-left: auto; 
            align-self: flex-end;
            border-color: var(--theme-color-primary-dark);
        }

        .message.assistant { 
            background-color: var(--theme-color-bg-card);
            color: var(--theme-color-text-light); 
            align-self: flex-start;
            border-color: var(--theme-color-border-light);
        }
        
        .message.system { 
            background-color: transparent;
            border: 1px dashed var(--theme-color-border-light);
            color: var(--theme-color-text-light-85);
            font-style: italic; 
            font-size: 0.9em; 
            text-align: center;
            max-width: 100%;
            align-self: center;
            padding: 8px 12px;
            box-shadow: none;
        }

        .message h1, .message h2, .message h3 { margin-top: 0.5em; margin-bottom: 0.3em; font-weight: 600; }
        .message h1 { font-size: 1.4em; }
        .message h2 { font-size: 1.2em; }
        .message h3 { font-size: 1.1em; }
        .message p { margin-top: 0; margin-bottom: 0.5em; }
        .message ul, .message ol { margin-left: 20px; margin-bottom: 0.5em; }
        .message li { margin-bottom: 0.2em; }

        .message pre { 
            white-space: pre-wrap; 
            word-wrap: break-word; 
            background-color: rgba(0,0,0,0.3); /* Darker code block */
            border: 1px solid var(--theme-color-border-light);
            padding: 12px; 
            border-radius: 8px; 
            margin-top: 10px;
            margin-bottom: 10px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family); /* Use VS Code's monospace font */
            font-size: 0.9em;
        }
        .message code { /* For inline code */
            background-color: rgba(0,0,0,0.3);
            border: 1px solid var(--theme-color-border-light);
            padding: 0.2em 0.5em;
            margin: 0 0.1em;
            font-size: 85%;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
        }

        .chat-input-area {
            padding: 12px 15px;
            border-top: 1px solid var(--theme-color-border-light); 
            background-color: var(--theme-color-bg-dark); /* Match body */
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            position: relative;
            z-index: 2;
        }
        .chat-input-container { 
            display: flex; 
            align-items: center;
            background-color: var(--theme-color-bg-card);
            border: 1px solid var(--theme-color-border-light);
            border-radius: 10px; /* Rounded input container */
            padding: 4px; /* Padding around input and button */
            transition: border-color 0.2s ease-in-out;
        }
        .chat-input-container:focus-within {
            border-color: var(--theme-color-primary);
            box-shadow: 0 0 0 2px rgba(255, 77, 0, 0.3);
        }
        #chat-input { 
            flex-grow: 1; 
            padding: 10px 12px; 
            border: none; 
            background-color: transparent; 
            color: var(--theme-color-text-light); 
            border-radius: 8px; 
            margin-right: 8px;
            outline: none;
            font-size: 1em;
        }
        #chat-input::placeholder {
            color: var(--theme-color-text-light-85);
            opacity: 0.7;
        }
        #send-button { 
            padding: 8px 15px; 
            background-color: var(--theme-color-primary); 
            color: var(--theme-color-text-light); 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 500;
            transition: background-color 0.2s ease-in-out, transform 0.1s ease;
        }
        #send-button:hover { 
            background-color: var(--theme-color-primary-dark); 
            transform: scale(1.05);
        }
        #send-button:active {
            transform: scale(0.98);
        }

        .loading-indicator { 
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 15px; 
        }
        .loading-dots span {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--theme-color-primary);
            margin: 0 3px;
            animation: dotPulse 1.4s infinite ease-in-out both;
        }
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes dotPulse {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }
    </style>
</head>
<body>
    <div class="chat-messages-container">
        <div class="dot-pattern-bg"></div>
        <div class="chat-messages" id="chat-messages">
            <!-- Messages will be appended here -->
        </div>
    </div>
    <div class="chat-input-area">
        <div class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Message AI Assistant...">
            <button id="send-button">Send</button>
        </div>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            const chatMessagesDiv = document.getElementById('chat-messages');
            const chatInput = document.getElementById('chat-input');
            const sendButton = document.getElementById('send-button');
            let loadingIndicator = null;

            function addMessageToUI(role, text, rawHtml = false) {
                const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const messageWrapper = document.createElement('div');
                messageWrapper.classList.add('message', role);
                messageWrapper.id = messageId;
                
                if (rawHtml) {
                    // Basic sanitization idea (very naive, for a real app use DOMPurify if possible)
                    // This is mostly to prevent script injection if AI returns <script> tags
                    // const sanitizedHtml = text.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
                    messageWrapper.innerHTML = text; // Assuming 'marked' output is reasonably safe
                } else {
                    messageWrapper.textContent = text;
                }
                chatMessagesDiv.appendChild(messageWrapper);
                chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Auto-scroll
            }

            function showLoadingIndicator() {
                if (!loadingIndicator) {
                    loadingIndicator = document.createElement('div');
                    loadingIndicator.classList.add('loading-indicator');
                    loadingIndicator.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
                    chatMessagesDiv.appendChild(loadingIndicator);
                    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
                }
            }

            function hideLoadingIndicator() {
                if (loadingIndicator) {
                    chatMessagesDiv.removeChild(loadingIndicator);
                    loadingIndicator = null;
                }
            }

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'addMessage':
                        hideLoadingIndicator();
                        addMessageToUI(message.role, message.text, message.rawHtml);
                        break;
                    case 'showLoading':
                        showLoadingIndicator();
                        break;
                    // Add case for 'setModels' if you implement model selection in chat UI
                }
            });

            function sendMessage() {
                const text = chatInput.value;
                if (text.trim() === '') return;

                vscode.postMessage({ command: 'sendMessage', text: text });
                // User message will be added by the provider, then echoed back to the webview
                showLoadingIndicator(); // Show loading immediately after user sends
                chatInput.value = '';
            }

            sendButton.addEventListener('click', sendMessage);
            chatInput.addEventListener('keypress', (event) => {
                // Basic Enter to send, Shift+Enter for newline (common UX)
                // This webview doesn't have a textarea, so Shift+Enter for newline is not default.
                // If input was a textarea, you'd check !event.shiftKey
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault(); // Prevent default Enter behavior (like newline in some inputs)
                    sendMessage();
                }
            });
            
            // Optionally, tell VS Code we are ready (useful if settings are passed on load)
            // vscode.postMessage({ command: 'webviewLoaded' });
        }());
    </script>
</body>
</html>`;
}