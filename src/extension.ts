"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from "vscode";
const processExists = require("process-exists");
const remark: any = require("remark");
import * as _ from "lodash";

enum Shell {
  Shell = "shell",
  Sh = "sh",
  Bash = "bash"
}

const shellLanguages = {
  [Shell.Shell]: true,
  [Shell.Sh]: true,
  [Shell.Bash]: true
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  class ShellCodeLensProvider implements vscode.CodeLensProvider {
    public async provideCodeLenses(
      document: vscode.TextDocument,
      token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
      const ast = remark()
        .data("setting", {
          gfm: true,
          commonmark: false,
          footnotes: false
        })
        .parse(document.getText());

      const codeNodes = (ast.children || []).filter(
        (v: any) => v.type === "code"
      );

      const array = codeNodes.map((v: any) => {
        // a zero-base line number
        const startLineNum = v.position.start.line - 1;
        const endLineNum = v.position.end.line - 1;
        const scriptStartLineNum = startLineNum + 1;
        const scriptEndLineNum = endLineNum;

        const script: string = document
          .getText(new vscode.Range(scriptStartLineNum, 0, scriptEndLineNum, 0))
          .trim();

        return [
          new vscode.CodeLens(
            new vscode.Range(startLineNum, 0, endLineNum, 0),
            {
              title: "Click to copy",
              command: "mdscript.copy",
              arguments: [scriptStartLineNum, scriptEndLineNum]
            }
          )
        ].concat(
          v.lang in shellLanguages
            ? [
                new vscode.CodeLens(
                  new vscode.Range(startLineNum, 0, endLineNum, 0),
                  {
                    title: "Click to run",
                    command: "mdscript.run",
                    arguments: [script]
                  }
                )
              ]
            : []
        );
      });
      return _.flatten(array);
    }
  }

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      "markdown",
      new ShellCodeLensProvider()
    )
  );

  let terminal: vscode.Terminal | null = null;

  context.subscriptions.push(
    vscode.commands.registerCommand("mdscript.run", async (script: string) => {
      const terminalName = "Markdown Script";
      if (!terminal) {
        terminal = vscode.window.createTerminal(terminalName);
        context.subscriptions.push(terminal);
      } else {
        const isAvailableTerminal = await processExists(
          await terminal.processId
        );
        if (isAvailableTerminal === false) {
          terminal = vscode.window.createTerminal(terminalName);
          context.subscriptions.push(terminal);
        }
      }
      terminal.show();
      terminal.sendText(script);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mdscript.copy",
      async (scriptStartLineNum: number, scriptEndLineNum: number) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return [];
        }
        editor.selection = new vscode.Selection(
          scriptStartLineNum,
          0,
          scriptEndLineNum,
          0
        );
        vscode.commands.executeCommand("editor.action.clipboardCopyAction");
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  //
}
