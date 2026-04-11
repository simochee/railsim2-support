import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import iconv from "iconv-lite";

const REPO_ROOT = resolve(process.cwd(), "../..");
const RAILSIM2_ROOT = resolve(
  REPO_ROOT,
  "vendor/railsim2/Distribution/jp/RailSim2",
);

function readShiftJIS(filePath: string): string {
  return iconv.decode(readFileSync(filePath), "shift_jis");
}

const SAMPLE_PATHS: Record<string, string> = {
  "Rail2.txt": "Rail/Default_JR_Narrow/Rail2.txt",
  "Tie2.txt": "Tie/Default_JRN_BallastPC/Tie2.txt",
  "Girder2.txt": "Girder/Default_JRN_DoublePC/Girder2.txt",
  "Pier2.txt": "Pier/Default_DoublePC/Pier2.txt",
  "Line2.txt": "Line/Default_SimpleCatenary/Line2.txt",
  "Pole2.txt": "Pole/Default_JRN_Single/Pole2.txt",
  "Train2.txt": "Train/Aizentranza01/Train2.txt",
  "Station2.txt": "Station/MM02/Station2.txt",
  "Struct2.txt": "Struct/Fence/Struct2.txt",
  "Surface2.txt": "Surface/Default/Surface2.txt",
  "Env2.txt": "Env/Default/Env2.txt",
  "Skin2.txt": "Skin/Default_Blue/Skin2.txt",
};

export interface Sample {
  fileName: string;
  displayName: string;
  content: string;
}

export function getSamples(): Sample[] {
  return Object.entries(SAMPLE_PATHS).map(([fileName, relativePath]) => {
    const parts = relativePath.split("/");
    const pluginName = parts[1];
    return {
      fileName,
      displayName: `${pluginName}/${fileName}`,
      content: readShiftJIS(resolve(RAILSIM2_ROOT, relativePath)),
    };
  });
}
