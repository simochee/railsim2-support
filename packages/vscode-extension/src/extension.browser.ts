import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/browser";

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const serverModule = vscode.Uri.joinPath(context.extensionUri, "out/server.browser.js");
  const worker = new Worker(serverModule.toString(true));

  client = new LanguageClient(
    "railsim2",
    "RailSim2 Support",
    { documentSelector: [{ language: "railsim2" }] },
    worker,
  );

  await client.start();
}

export async function deactivate() {
  if (client) {
    await client.stop();
  }
}
