# Tessa Agent - VS Code Extension

Tessa Agent is your intelligent AI coding assistant for Visual Studio Code, powered by OpenAI-compatible APIs.

## Features

-   **Tabbed Sidebar Interface**:
    -   **Chat Tab**: Interactive chat with Tessa Agent.
        -   Context-aware responses using your active file and selection.
        -   Supports markdown for rich responses.
        -   **Refresh Context**: Button to manually update Tessa with the latest editor state.
        -   **Insert Code**: Easily insert AI-generated code snippets into your editor at the cursor.
        -   **Edit Messages**: Modify your previous prompts and Tessa will re-evaluate the conversation.
        -   **Chat Commands**:
            -   `/fim`: Perform Fill-In-Middle at your current cursor position.
            -   `/explain`: Ask Tessa to explain selected code or the current file.
            -   `/update_file <instruction>`: Request Tessa to propose changes to the active file (review via diff).
    -   **Settings Tab**:
        -   Configure multiple AI models (name, API model ID, specific API URL/Key, type).
        -   Assign your configured models to different use cases (Chat, Inline Completion, FIM).
-   **Inline Code Completion**: Get AI-powered code suggestions as you type.
-   **Configurable**: Set your global OpenAI API Key and URL in VS Code settings. Override per model in the sidebar settings.

## Setup

1.  Clone this repository.
2.  Run `npm install` in the root directory.
3.  Run `npm run compile` (or `npm run watch`).
4.  Open the project in VS Code.
5.  Press `F5` to launch the Extension Development Host.

## Configuration

**Required:**

1.  In the Extension Development Host window, open VS Code Settings (Ctrl/Cmd + ,).
2.  Search for "Tessa Agent".
3.  Set your global **`Tessa Agent: Api Key`**.

**Optional (via VS Code Settings):**

-   **`Tessa Agent: Api Url`**: If using a proxy or custom endpoint.
-   **`Tessa Agent: Model Assignment`**: Set default model IDs for Chat, Completion, and FIM. These IDs must correspond to models you configure in the sidebar.
-   **`Tessa Agent: Model Configurations`**: Pre-populate some common models. You can manage these more easily via the "Settings" tab in the Tessa Agent sidebar.

**Via Tessa Agent Sidebar "Settings" Tab:**

-   **Add/Remove Models**: Define custom names, API model IDs, specific API URLs/Keys (optional, overrides global), and model types (chat/completion).
-   **Assign Models**: Choose which of your configured models should be used for Chat, Inline Completion, and Fill-In-Middle tasks.

## How to Use

-   **Open Tessa Agent**: Click the Tessa Agent icon in the VS Code activity bar.
-   **Chat**: Use the "Chat" tab. Type messages or commands.
-   **Configure**: Use the "Settings" tab to manage your AI models.
-   **Completion**: Start typing in your code files.
-   **FIM**: In the chat, type `/fim` and Tessa will use the code around your current cursor to fill in the middle.


<!-- add a button to refresh context (starts a new chat)
when you talk to the ai it should use the context of the file you are currently in + the surrounding code to your cursor
when the ai generates code you should be able to click copy on that code box and copy the contents to your clipboard.
fill in the middle should be launched from a command as such / in the chat instead of how it is currently. all commands should show up when i hit / -->
