import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  process.exit(0);
}

if (!existsSync("public")) {
  mkdirSync("public", { recursive: true });
}

rmSync("public", { recursive: true, force: true });
mkdirSync("public", { recursive: true });
cpSync("out", "public", { recursive: true });
console.log("Copied out -> public");
