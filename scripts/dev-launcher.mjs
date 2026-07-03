// Sets up PATH so Turbopack's PostCSS worker can find `node`, then starts next dev
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeDir = path.dirname(process.execPath);
const projectDir = path.join(__dirname, "..");

// Prepend the node binary directory to PATH so child processes can find `node`
process.env.PATH = `${nodeDir}${path.delimiter}${process.env.PATH ?? ""}`;

const nextBin = path.join(projectDir, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: projectDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
