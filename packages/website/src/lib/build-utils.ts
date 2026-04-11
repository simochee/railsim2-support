import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import iconv from "iconv-lite";

export const REPO_ROOT = resolve(process.cwd(), "../..");
export const RAILSIM2_ROOT = resolve(
  REPO_ROOT,
  "vendor/railsim2/Distribution/jp/RailSim2",
);

export function readShiftJIS(filePath: string): string {
  return iconv.decode(readFileSync(filePath), "shift_jis");
}
