import { createConnection, ProposedFeatures } from "vscode-languageserver/node";
import { startServer } from "./server.js";

const connection = createConnection(ProposedFeatures.all);
startServer(connection);
