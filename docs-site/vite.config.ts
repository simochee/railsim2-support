import { defineConfig } from "vite";
import { rs2Help } from "./plugins/rs2-help";

export default defineConfig({
  plugins: [rs2Help()],
});
