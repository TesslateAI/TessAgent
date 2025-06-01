// src/settingsManager.ts
import * as vscode from 'vscode';
import { ModelConfig } from './types';

const EXTENSION_ID = 'myAiChat'; // This is the key used in package.json configuration section

export class SettingsManager {
    public static getGlobalApiKey(): string | undefined {
        return vscode.workspace.getConfiguration(EXTENSION_ID).get<string>('apiKey') || undefined;
    }

    public static getGlobalApiUrl(): string {
        return vscode.workspace.getConfiguration(EXTENSION_ID).get<string>('apiUrl') || 'https://api.openai.com/v1';
    }

    public static getDefaultChatModelId(): string {
        return vscode.workspace.getConfiguration(EXTENSION_ID).get<string>('defaultChatModel') || 'gpt-3.5-turbo';
    }

    public static getDefaultCompletionModelId(): string {
        // Return empty string if not set, allowing completion to be disabled
        return vscode.workspace.getConfiguration(EXTENSION_ID).get<string>('defaultCompletionModel') || ''; 
    }
    
    public static getDefaultFimModelId(): string {
        return vscode.workspace.getConfiguration(EXTENSION_ID).get<string>('defaultFimModel') || 'gpt-3.5-turbo';
    }

    public static getModelConfigurations(): ModelConfig[] {
        return vscode.workspace.getConfiguration(EXTENSION_ID).get<ModelConfig[]>('modelConfigurations') || [];
    }

    public static getModelConfigById(modelId: string): ModelConfig | undefined {
        const configs = this.getModelConfigurations();
        return configs.find(config => config.id === modelId);
    }

    public static getApiKey(modelId?: string): string | undefined {
        if (modelId) {
            const modelConfig = this.getModelConfigById(modelId);
            if (modelConfig?.apiKey && modelConfig.apiKey.trim() !== '') {
                return modelConfig.apiKey;
            }
        }
        return this.getGlobalApiKey();
    }

    public static getApiUrl(modelId?: string): string {
        if (modelId) {
            const modelConfig = this.getModelConfigById(modelId);
            if (modelConfig?.apiUrl && modelConfig.apiUrl.trim() !== '') {
                return modelConfig.apiUrl;
            }
        }
        return this.getGlobalApiUrl();
    }
}