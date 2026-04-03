import { existsSync, rmSync } from "node:fs";

if (existsSync("public")) {
  rmSync("public", { recursive: true, force: true });
}
