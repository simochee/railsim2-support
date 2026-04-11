import * as esbuild from "esbuild";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

await Promise.all([
  // Client: extension.ts → out/extension.js (Node)
  esbuild.build({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    outfile: "out/extension.js",
    external: ["vscode"],
    format: "cjs",
    platform: "node",
    sourcemap: true,
  }),

  // Server: language-server → out/server.js (Node)
  esbuild.build({
    entryPoints: [require.resolve("@railsim2-support/language-server/node")],
    bundle: true,
    outfile: "out/server.js",
    format: "cjs",
    platform: "node",
    sourcemap: true,
  }),

  // Client: extension.browser.ts → out/extension.browser.js (Browser)
  esbuild.build({
    entryPoints: ["src/extension.browser.ts"],
    bundle: true,
    outfile: "out/extension.browser.js",
    external: ["vscode"],
    format: "cjs",
    platform: "browser",
    sourcemap: true,
  }),

  // Server: language-server browser → out/server.browser.js (Browser Worker)
  esbuild.build({
    entryPoints: [require.resolve("@railsim2-support/language-server/browser")],
    bundle: true,
    outfile: "out/server.browser.js",
    format: "iife",
    platform: "browser",
    sourcemap: true,
  }),
]);
