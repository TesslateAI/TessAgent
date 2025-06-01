// src/fileUpdater.ts
import * as vscode from 'vscode';

export async function applyFileUpdateWithDiff(
    filePath: string,
    newContent: string,
    originalContent: string
) {
    try {
        const targetUri = vscode.Uri.file(filePath);
        
        const choice = await vscode.window.showInformationMessage(
            `AI suggests an update for ${vscode.workspace.asRelativePath(targetUri)}.`,
            { modal: true },
            "Review and Apply", "Apply Directly", "Cancel"
        );

        if (choice === "Review and Apply") {
            // Create temporary files for diff view
            const tempOriginalUri = vscode.Uri.file(filePath + ".original_by_ai.tmp");
            await vscode.workspace.fs.writeFile(tempOriginalUri, Buffer.from(originalContent, 'utf8'));
            
            const tempNewUri = vscode.Uri.file(filePath + ".new_by_ai.tmp");
            await vscode.workspace.fs.writeFile(tempNewUri, Buffer.from(newContent, 'utf8'));

            await vscode.commands.executeCommand('vscode.diff', tempOriginalUri, tempNewUri, `Diff: ${vscode.workspace.asRelativePath(targetUri)} (Original vs AI Suggestion)`);
            
            const applyAfterReview = await vscode.window.showQuickPick(
                [
                    { label: "Apply Changes", description: `Update ${vscode.workspace.asRelativePath(targetUri)} with AI's version` },
                    { label: "Discard Changes", description: "Keep the original file content" }
                ],
                { placeHolder: "Apply changes shown in diff to the original file?" }
            );

            if (applyAfterReview?.label === "Apply Changes") {
                await vscode.workspace.fs.writeFile(targetUri, Buffer.from(newContent, 'utf8'));
                vscode.window.showInformationMessage(`File ${vscode.workspace.asRelativePath(targetUri)} updated by AI.`);
            } else {
                vscode.window.showInformationMessage(`Changes for ${vscode.workspace.asRelativePath(targetUri)} discarded.`);
            }
            
            // Clean up temp files
            await vscode.workspace.fs.delete(tempOriginalUri, { useTrash: false });
            await vscode.workspace.fs.delete(tempNewUri, { useTrash: false });

        } else if (choice === "Apply Directly") {
            await vscode.workspace.fs.writeFile(targetUri, Buffer.from(newContent, 'utf8'));
            vscode.window.showInformationMessage(`File ${vscode.workspace.asRelativePath(targetUri)} updated by AI.`);
        } else {
             vscode.window.showInformationMessage(`Update for ${vscode.workspace.asRelativePath(targetUri)} cancelled.`);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to update file ${filePath}: ${error.message}`);
        console.error("File update error:", error);
    }
}