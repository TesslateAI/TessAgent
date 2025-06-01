// src/chatUIManager.ts
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid'; // For generating nonce

export function getChatUIContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = uuidv4();
    
    const thermiqueTheme = {
        colorPrimary: 'rgb(255, 77, 0)',
        colorPrimaryDark: 'rgb(204, 61, 0)',
        colorAccentYellow: 'rgb(250, 187, 0)',
        colorBgDark: 'rgb(17, 17, 17)',
        colorBgCard: 'rgb(28, 28, 28)',
        colorTextLight: 'rgb(220, 220, 220)',
        colorTextLight85: 'rgba(220, 220, 220, 0.85)',
        colorBorderLight: 'rgba(255, 255, 255, 0.15)',
        colorBorderOrange: 'rgba(112, 69, 54, 0.7)',
        fontPrimary: "'Inter', var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-A">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} https: data:; img-src ${webview.cspSource} https: data:;">
    <title>Tessa Agent Chat</title>
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
            overflow: hidden; 
        }
        
        .dot-pattern-bg {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1.2px);
            background-size: 22px 22px;
            z-index: 0;
        }

        .chat-messages { 
            flex-grow: 1; 
            padding: 15px; 
            overflow-y: auto; 
            position: relative; 
            z-index: 1;
            height: 100%; 
        }

        .chat-messages::-webkit-scrollbar { width: 8px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb {
            background-color: var(--theme-color-border-light); 
            border-radius: 10px;
            border: 2px solid transparent; 
            background-clip: content-box;
        }
        .chat-messages::-webkit-scrollbar-thumb:hover { background-color: var(--theme-color-primary); }

        .message { 
            margin-bottom: 15px; 
            padding: 12px 18px; 
            border-radius: 12px; 
            max-width: 85%; 
            word-wrap: break-word; 
            line-height: 1.6;
            border: 1px solid transparent;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
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
        .message h1 { font-size: 1.4em; } .message h2 { font-size: 1.2em; } .message h3 { font-size: 1.1em; }
        .message p { margin-top: 0; margin-bottom: 0.5em; }
        .message ul, .message ol { margin-left: 20px; margin-bottom: 0.5em; }
        .message li { margin-bottom: 0.2em; }

        .message pre { 
            position: relative; /* For copy button */
            white-space: pre-wrap; 
            word-wrap: break-word; 
            background-color: rgba(0,0,0,0.3); 
            border: 1px solid var(--theme-color-border-light);
            padding: 12px; 
            padding-top: 30px; /* Space for copy button */
            border-radius: 8px; 
            margin-top: 10px;
            margin-bottom: 10px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, monospace); 
            font-size: 0.9em;
        }
        .copy-code-button {
            position: absolute;
            top: 6px;
            right: 6px;
            padding: 4px 8px;
            background-color: var(--theme-color-bg-card);
            color: var(--theme-color-text-light-85);
            border: 1px solid var(--theme-color-border-light);
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
            opacity: 0.7;
            transition: opacity 0.2s, background-color 0.2s;
        }
        .message pre:hover .copy-code-button {
            opacity: 1;
        }
        .copy-code-button:hover {
            background-color: var(--theme-color-primary);
            color: white;
        }

        .message code { /* For inline code */
            background-color: rgba(0,0,0,0.3);
            border: 1px solid var(--theme-color-border-light);
            padding: 0.2em 0.5em;
            margin: 0 0.1em;
            font-size: 85%;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family, monospace);
        }

        .chat-input-area {
            padding: 12px 15px;
            border-top: 1px solid var(--theme-color-border-light); 
            background-color: var(--theme-color-bg-dark);
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            position: relative;
            z-index: 2;
        }
        #command-suggestions {
            position: absolute;
            bottom: calc(100% - 1px); /* Position above the input area, align with top border */
            left: 15px; 
            right: 15px;
            background-color: var(--theme-color-bg-card);
            border: 1px solid var(--theme-color-border-light);
            border-bottom: none;
            border-radius: 8px 8px 0 0;
            max-height: 150px;
            overflow-y: auto;
            z-index: 10; 
            box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
        }
        #command-suggestions ul { list-style: none; padding: 0; margin: 0; }
        #command-suggestions li {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--theme-color-border-light);
            font-size: 0.9em;
            display: flex;
            justify-content: space-between;
        }
        #command-suggestions li:last-child { border-bottom: none; }
        #command-suggestions li:hover, #command-suggestions li.selected {
            background-color: var(--theme-color-primary);
            color: white;
        }
        #command-suggestions li .cmd-name { font-weight: 600; }
        #command-suggestions li .cmd-desc { 
            color: var(--theme-color-text-light-85); 
            margin-left: 8px; 
            font-size: 0.9em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        #command-suggestions li:hover .cmd-desc, #command-suggestions li.selected .cmd-desc { color: rgba(255,255,255,0.8); }


        .chat-input-container { 
            display: flex; 
            align-items: center;
            background-color: var(--theme-color-bg-card);
            border: 1px solid var(--theme-color-border-light);
            border-radius: 10px; 
            padding: 4px; 
            transition: border-color 0.2s ease-in-out;
        }
        .chat-input-container:focus-within {
            border-color: var(--theme-color-primary);
            box-shadow: 0 0 0 2px rgba(255, 77, 0, 0.3);
        }
        #refresh-button {
            padding: 8px;
            background-color: transparent;
            color: var(--theme-color-text-light-85);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-right: 6px; /* Space between refresh and input */
            margin-left: 2px; /* Align with overall padding */
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
        }
        #refresh-button:hover {
            background-color: rgba(255,255,255,0.1);
            color: var(--theme-color-text-light);
        }
        #refresh-button svg {
            pointer-events: none; /* Ensure click goes to button */
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
        #send-button:hover { background-color: var(--theme-color-primary-dark); transform: scale(1.02); }
        #send-button:active { transform: scale(0.98); }

        .loading-indicator { display: flex; align-items: center; justify-content: center; padding: 15px; }
        .loading-dots span {
            display: inline-block; width: 8px; height: 8px; border-radius: 50%;
            background-color: var(--theme-color-primary); margin: 0 3px;
            animation: dotPulse 1.4s infinite ease-in-out both;
        }
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes dotPulse { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
    </style>
</head>
<body>
    <div class="chat-messages-container">
        <div class="dot-pattern-bg"></div>
        <div class="chat-messages" id="chat-messages"></div>
    </div>
    <div class="chat-input-area">
        <div id="command-suggestions" style="display: none;">
            <ul></ul>
        </div>
        <div class="chat-input-container">
            <button id="refresh-button" title="Refresh Chat (New Session)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10c2.306 0 4.439-.799 6.142-2.142l-1.446-1.446A7.943 7.943 0 0 1 12 20a8 8 0 1 1 8-8h-3l4 4 4-4h-3.055A9.954 9.954 0 0 0 12 2z"/>
                </svg>
            </button>
            <input type="text" id="chat-input" placeholder="Message AI or type / for commands...">
            <button id="send-button">Send</button>
        </div>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            const chatMessagesDiv = document.getElementById('chat-messages');
            const chatInput = document.getElementById('chat-input');
            const sendButton = document.getElementById('send-button');
            const refreshButton = document.getElementById('refresh-button');
            const suggestionsPopup = document.getElementById('command-suggestions');
            const suggestionsList = suggestionsPopup.querySelector('ul');
            let loadingIndicator = null;
            let currentSuggestionIndex = -1;

            const availableCommands = [
                { cmd: '/fim', description: 'Fill in the middle at cursor' },
                { cmd: '/explain', description: 'Explain selected code or context' },
                { cmd: '/update_file', description: 'Suggest file changes (e.g., /update_file refactor this)' }
            ];

            function addMessageToUI(role, text, rawHtml = false) {
                const messageWrapper = document.createElement('div');
                messageWrapper.classList.add('message', role);
                
                if (rawHtml) {
                    messageWrapper.innerHTML = text;
                    const preBlocks = messageWrapper.querySelectorAll('pre');
                    preBlocks.forEach(pre => {
                        const codeBlock = pre.querySelector('code');
                        if (!codeBlock && !pre.textContent.trim()) return; // Skip if pre has no code or only whitespace

                        const copyButton = document.createElement('button');
                        copyButton.className = 'copy-code-button';
                        copyButton.textContent = 'Copy';
                        pre.appendChild(copyButton);

                        copyButton.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent message click if any
                            const codeToCopy = codeBlock ? codeBlock.textContent : pre.textContent;
                            navigator.clipboard.writeText(codeToCopy)
                                .then(() => {
                                    copyButton.textContent = 'Copied!';
                                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                                })
                                .catch(err => {
                                    console.error('Failed to copy text: ', err);
                                    copyButton.textContent = 'Error';
                                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                                });
                        });
                    });
                } else {
                    messageWrapper.textContent = text;
                }
                chatMessagesDiv.appendChild(messageWrapper);
                chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
            }

            function showLoadingIndicator() {
                if (loadingIndicator) return;
                loadingIndicator = document.createElement('div');
                loadingIndicator.classList.add('loading-indicator');
                loadingIndicator.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
                chatMessagesDiv.appendChild(loadingIndicator);
                chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
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
                    case 'resetChat':
                        chatMessagesDiv.innerHTML = '';
                        hideLoadingIndicator(); // Ensure loading is gone
                        // The provider will send the initial message after reset
                        break;
                }
            });

            function sendMessage() {
                const text = chatInput.value;
                if (text.trim() === '') return;
                vscode.postMessage({ command: 'sendMessage', text: text });
                showLoadingIndicator();
                chatInput.value = '';
                hideSuggestions();
            }

            sendButton.addEventListener('click', sendMessage);
            
            refreshButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'refreshChat' });
            });

            // --- Slash Command Suggestions Logic ---
            function showSuggestions(query) {
                suggestionsList.innerHTML = '';
                const filteredCommands = availableCommands.filter(c => c.cmd.toLowerCase().startsWith(query.toLowerCase()));
                
                if (filteredCommands.length > 0) {
                    filteredCommands.forEach((command) => {
                        const li = document.createElement('li');
                        li.dataset.command = command.cmd;
                        li.innerHTML = \`<span class="cmd-name">\${command.cmd}</span> <span class="cmd-desc">\${command.description}</span>\`;
                        li.addEventListener('click', () => {
                            chatInput.value = command.cmd + ' ';
                            hideSuggestions();
                            chatInput.focus();
                        });
                        suggestionsList.appendChild(li);
                    });
                    suggestionsPopup.style.display = 'block';
                    currentSuggestionIndex = -1;
                } else {
                    hideSuggestions();
                }
            }

            function hideSuggestions() {
                suggestionsPopup.style.display = 'none';
                currentSuggestionIndex = -1;
            }

            function selectSuggestion(direction) { // 1 for down, -1 for up
                const items = suggestionsList.querySelectorAll('li');
                if (items.length === 0) return;

                if (currentSuggestionIndex >= 0) items[currentSuggestionIndex].classList.remove('selected');
                
                currentSuggestionIndex += direction;

                if (currentSuggestionIndex < 0) currentSuggestionIndex = items.length - 1;
                else if (currentSuggestionIndex >= items.length) currentSuggestionIndex = 0;
                
                items[currentSuggestionIndex].classList.add('selected');
                items[currentSuggestionIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }

            chatInput.addEventListener('input', () => {
                const text = chatInput.value;
                const cursorPos = chatInput.selectionStart;
                // Only show suggestions if cursor is at the end of a word starting with / and no space after /
                const wordBeforeCursor = text.substring(0, cursorPos).split(/\\s+/).pop();

                if (wordBeforeCursor.startsWith('/') && !wordBeforeCursor.includes(' ',1)) {
                     showSuggestions(wordBeforeCursor);
                } else {
                    hideSuggestions();
                }
            });

            chatInput.addEventListener('keydown', (event) => {
                if (suggestionsPopup.style.display === 'block') {
                    if (event.key === 'ArrowDown') {
                        event.preventDefault(); selectSuggestion(1);
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault(); selectSuggestion(-1);
                    } else if (event.key === 'Enter' || event.key === 'Tab') {
                        if (currentSuggestionIndex !== -1) {
                            event.preventDefault();
                            const selectedLi = suggestionsList.querySelector('li.selected');
                            if (selectedLi) {
                                chatInput.value = selectedLi.dataset.command + ' ';
                                hideSuggestions();
                                // if (event.key === 'Enter') sendMessage(); // Uncomment to send immediately on Enter
                            }
                        } else if (event.key === 'Enter' && !event.shiftKey) {
                             event.preventDefault(); sendMessage(); // Default Enter behavior
                        }
                    } else if (event.key === 'Escape') {
                        event.preventDefault(); hideSuggestions();
                    }
                } else if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault(); sendMessage();
                }
            });

            document.addEventListener('click', (event) => {
                if (!chatInput.contains(event.target) && !suggestionsPopup.contains(event.target)) {
                    hideSuggestions();
                }
            });
            // --- End Slash Command Suggestions Logic ---

            // Optionally, tell VS Code we are ready
            // vscode.postMessage({ command: 'webviewLoaded' });
        }());
    </script>
</body>
</html>`;
}