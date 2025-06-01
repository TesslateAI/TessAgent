// src/fileUpdater.ts
import * as vscode from 'vscode';

export async function applyFileUpdateWithDiff(
    filePath: string,
    newContent: string,
    originalContent: string
) {
    try {
        const targetUri = vscode.Uri.file(filePath);
        const relativePath = vscode.workspace.asRelativePath(targetUri);
        
        const choice = await vscode.window.showInformationMessage(
            `Tessa Agent suggests an update for ${relativePath}.`,
            { modal: true },
            "Review and Apply", "Apply Directly", "Cancel"
        );

        if (choice === "Review and Apply") {
            const tempOriginalUri = vscode.Uri.file(filePath + ".original_by_tessa.tmp"); // Unique temp file extension
            await vscode.workspace.fs.writeFile(tempOriginalUri, Buffer.from(originalContent, 'utf8'));
            
            const tempNewUri = vscode.Uri.file(filePath + ".new_by_tessa.tmp");
            await vscode.workspace.fs.writeFile(tempNewUri, Buffer.from(newContent, 'utf8'));

            await vscode.commands.executeCommand('vscode.diff', tempOriginalUri, tempNewUri, `Diff: ${relativePath} (Original vs Tessa's Suggestion)`);
            
            const applyAfterReview = await vscode.window.showQuickPick(
                [
                    { label: "Apply Changes", description: `Update ${relativePath} with Tessa's version` },
                    { label: "Discard Changes", description: "Keep the original file content" }
                ],
                { placeHolder: "Apply changes shown in diff to the original file?" }
            );

            if (applyAfterReview?.label === "Apply Changes") {
                await vscode.workspace.fs.writeFile(targetUri, Buffer.from(newContent, 'utf8'));
                vscode.window.showInformationMessage(`File ${relativePath} updated by Tessa Agent.`);
            } else {
                vscode.window.showInformationMessage(`Changes for ${relativePath} discarded.`);
            }
            
            // Clean up temp files
            try { await vscode.workspace.fs.delete(tempOriginalUri, { useTrash: false }); } catch (e) { console.warn("Could not delete temp original:", e); }
            try { await vscode.workspace.fs.delete(tempNewUri, { useTrash: false }); } catch (e) { console.warn("Could not delete temp new:", e); }


        } else if (choice === "Apply Directly") {
            await vscode.workspace.fs.writeFile(targetUri, Buffer.from(newContent, 'utf8'));
            vscode.window.showInformationMessage(`File ${relativePath} updated by Tessa Agent.`);
        } else {
             vscode.window.showInformationMessage(`Update for ${relativePath} cancelled.`);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to update file ${filePath}: ${error.message}`);
        console.error("File update error:", error);
    }
}