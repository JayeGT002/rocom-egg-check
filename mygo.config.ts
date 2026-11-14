import { defineConfig } from "mygo-cli";

export default defineConfig({
  name: "Rocom Egg Check",
  identifier: "app.rocomeggcheck.desktop",
  version: "1.2.0",
  icon: "ui-draft/public/app-icon.png",
  devUrl: "http://127.0.0.1:5173",
  devCommand: "npm --prefix ui-draft run dev",
  buildCommand: "npm --prefix ui-draft run build",
  frontendDist: "ui-draft/dist",
  bindings: "ui-draft/src/mygo.ts",
  out: "build",
});
