#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxJsBytes = 500000;
const maxEntryJsBytes = 300000;
const requiredChunkPrefixes = [
  "react-vendor-",
  "icons-vendor-",
  "dashboard-data-runtime-",
  "dashboard-i18n-",
  "dashboard-design-system-",
];

try {
  const packageJson = readJson("package.json");
  assert(packageJson.scripts?.["dashboard:build"] === "vite build", "package.json must keep dashboard:build as the Vite build command");
  assert(packageJson.scripts?.["dashboard:build-check"] === "node ./tools/check_dashboard_bundle_contract.mjs", "package.json must expose dashboard:build-check");

  const viteConfig = readText("vite.config.mjs");
  const warningLimitMatch = viteConfig.match(/chunkSizeWarningLimit\s*:\s*(\d+)/);
  if (warningLimitMatch) {
    assert(Number(warningLimitMatch[1]) <= 500, "Dashboard Control Center must not raise chunkSizeWarningLimit above the default-scale limit");
  }
  assert(viteConfig.includes("codeSplitting"), "Dashboard Control Center build must keep explicit code-splitting groups");
  for (const prefix of requiredChunkPrefixes) {
    assert(viteConfig.includes(prefix.slice(0, -1)), `Dashboard Control Center Vite config must define ${prefix.slice(0, -1)} chunk`);
  }

  const build = spawnSync("npm", ["run", "dashboard:build"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  const output = `${build.stdout || ""}\n${build.stderr || ""}`;
  process.stdout.write(build.stdout || "");
  process.stderr.write(build.stderr || "");
  assert(build.status === 0, "dashboard:build must pass before bundle inspection");
  assert(!/Some chunks are larger|chunk size limit|chunkSizeWarningLimit/i.test(output), "Dashboard Control Center build must not emit a large chunk warning");

  const assetsDir = path.join(root, "dist/dashboard-control-center/assets");
  assert(existsSync(assetsDir), "Dashboard Control Center build must emit dist/dashboard-control-center/assets");
  const jsAssets = readdirSync(assetsDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => ({
      file,
      bytes: statSync(path.join(assetsDir, file)).size,
      body: readFileSync(path.join(assetsDir, file), "utf8"),
    }))
    .sort((left, right) => right.bytes - left.bytes);

  assert(jsAssets.length >= 2, "Dashboard Control Center build must emit multiple JS chunks, not one monolith");
  const entryAsset = jsAssets.find((asset) => /^index-[A-Za-z0-9_-]+\.js$/.test(asset.file));
  assert(entryAsset, "Dashboard Control Center build must emit a hashed index entry JS asset");
  assert(entryAsset.bytes <= maxEntryJsBytes, `Dashboard Control Center entry JS chunk ${entryAsset.file} is ${entryAsset.bytes} bytes, over ${maxEntryJsBytes}`);
  for (const prefix of requiredChunkPrefixes) {
    assert(jsAssets.some((asset) => asset.file.startsWith(prefix)), `Dashboard Control Center build must emit ${prefix} chunk`);
  }
  for (const asset of jsAssets) {
    assert(asset.bytes <= maxJsBytes, `Dashboard Control Center JS chunk ${asset.file} is ${asset.bytes} bytes, over ${maxJsBytes}`);
    assert(!/from\s*["'](?:\.\.\/)*test-results\//.test(asset.body), `Dashboard Control Center chunk ${asset.file} must not import code from test-results/`);
    assert(!/from\s*["'](?:\.\.\/)*\.repository-development-runs\//.test(asset.body), `Dashboard Control Center chunk ${asset.file} must not import code from .repository-development-runs/`);
  }

  const summary = jsAssets.map((asset) => `${asset.file}:${asset.bytes}`).join(" ");
  console.log(`Dashboard Control Center bundle contract passed (${summary})`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
