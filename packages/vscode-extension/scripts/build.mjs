import * as esbuild from "esbuild";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Client: extension.ts → out/extension.js
await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
});

// Server: language-server の server.ts → out/server.js
await esbuild.build({
  entryPoints: [require.resolve("@railsim2-support/language-server/node")],
  bundle: true,
  outfile: "out/server.js",
  format: "cjs",
  platform: "node",
  sourcemap: true,
});
