"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from "vscode";
import * as _ from "lodash";
import { init, localize } from "vscode-nls-i18n";
const processExists = require("process-exists");
const remark: any = require("remark");

enum Shell {
  Shell = "shell",
  Sh = "sh",
  Bash = "bash"
}

enum Command {
  Copy = "markdown-script.copy",
  Run = "markdown-script.run"
}

const shellLanguages = {
  [Shell.Shell]: true,
  [Shell.Sh]: true,
  [Shell.Bash]: true
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  init(context);
  class ShellCodeLensProvider implements vscode.CodeLensProvider {
    public async provideCodeLenses(
      document: vscode.TextDocument
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
        // !!!: vscode 是从第 0 行开始, 而解析器从第 1 行开始
        const startLineNum = v.position.start.line - 1;
        const endLineNum = v.position.end.line - 1;

        const start = new vscode.Position(v.position.start.line, 0);

        const end = new vscode.Position(
          endLineNum - 1,
          document.lineAt(endLineNum - 1).text.length
        );

        const script: string = document
          .getText(new vscode.Range(start, end))
          .trim();

        const copy = [
          new vscode.CodeLens(
            new vscode.Range(startLineNum, 0, endLineNum, 3),
            {
              title: localize("ext.btn.click2copy"), // click to copy
              command: Command.Copy,
              arguments: [script]
            }
          )
        ];

        const run =
          v.lang in shellLanguages
            ? [
                new vscode.CodeLens(
                  new vscode.Range(startLineNum, 0, endLineNum, 3),
                  {
                    title: localize("ext.btn.click2run"), // click to run
                    command: Command.Run,
                    arguments: [script]
                  }
                )
              ]
            : [];

        return [...copy, ...run];
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
    vscode.commands.registerCommand(Command.Run, async (script: string) => {
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
    vscode.commands.registerCommand(Command.Copy, async (content: string) => {
      await vscode.env.clipboard.writeText(content);
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  //
}
