import * as vscode from 'vscode';

export class LineEndingChecker {
    static checkActiveEditorLineEndings () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
    
        if (editor.document.fileName.match(/\.rul$/) && editor.document.getText().indexOf("\r\n") !== -1) {
            let message = 'It looks like this file (';
            message += editor.document.fileName.slice(editor.document.fileName.lastIndexOf('/') + 1);
            message += ') has Windows (CRLF) line endings. Would you like me to convert it to Unix (LF)? ';
            message += 'If the rule files are not converted, this tool won\'t work properly.'
    
            vscode.window.showErrorMessage(message, 'Yes', 'No').then(selection => {
                if (selection === 'Yes') {
                    editor.edit(builder => {
                        builder.setEndOfLine(vscode.EndOfLine.LF);
                    }).then(() => {
                        vscode.window.showInformationMessage('Done. Don\'t forget to save!');
                    });
                }
            });
        }
    }
}