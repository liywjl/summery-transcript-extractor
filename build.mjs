import { cp, mkdir, rm } from "node:fs/promises";
import * as esbuild from "esbuild";

const isWatching = process.argv.includes("--watch");

const scripts = {
  entryPoints: {
    background: "src/background.ts",
    popup: "src/popup/popup.ts",
    options: "src/options/options.ts",
    offscreen: "src/offscreen/offscreen.ts",
    "extract-page": "src/page/extractPageScript.ts",
  },
  bundle: true,
  format: "iife",
  target: "chrome116",
  outdir: "dist",
  logLevel: "info",
};

const styles = {
  entryPoints: {
    popup: "src/popup/popup.css",
    options: "src/options/options.css",
  },
  bundle: true,
  outdir: "dist",
  logLevel: "info",
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("public", "dist", { recursive: true });
await cp("src/popup/popup.html", "dist/popup.html");
await cp("src/options/options.html", "dist/options.html");

if (isWatching) {
  await (await esbuild.context(scripts)).watch();
  await (await esbuild.context(styles)).watch();
} else {
  await esbuild.build(scripts);
  await esbuild.build(styles);
}
