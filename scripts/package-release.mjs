import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const distDir = join(rootDir, "dist");
const packageJson = readJson("package.json");
const manifestJson = readJson("manifest.json");
const version = packageJson.version;
const archiveName = `chatmusic-v${version}.zip`;
const archivePath = join(rootDir, archiveName);

run("npm", ["run", "version:check"]);
run("npm", ["run", "build"]);
validateDist();
createArchive();
validateArchive();

console.log(`Release package ready: ${archiveName} (${formatBytes(statSync(archivePath).size)})`);

function validateDist() {
  if (!existsSync(distDir)) fail("dist/ does not exist. Build the extension first.");

  const distManifest = readJson("dist/manifest.json");
  if (distManifest.version !== version) {
    fail(
      `dist/manifest.json version ${distManifest.version} does not match package.json version ${version}.`
    );
  }

  if (manifestJson.version !== version) {
    fail(
      `manifest.json version ${manifestJson.version} does not match package.json version ${version}.`
    );
  }

  if (distManifest.host_permissions !== undefined) {
    fail("dist/manifest.json should not include remote host_permissions for default playback.");
  }

  assertFile("dist/THIRD_PARTY_NOTICES.txt");
  assertFile("dist/icons/icon16.png");
  assertFile("dist/icons/icon48.png");
  assertFile("dist/icons/icon128.png");

  const soundfontDir = join(
    distDir,
    "soundfonts",
    "FluidR3_GM",
    "acoustic_grand_piano-mp3"
  );
  const soundfontFiles = readdirSync(soundfontDir).filter((name) => name.endsWith(".mp3"));
  if (soundfontFiles.length !== 88) {
    fail(`Expected 88 bundled piano soundfont MP3 files, found ${soundfontFiles.length}.`);
  }
}

function createArchive() {
  rmSync(archivePath, { force: true });
  run("zip", ["-qr", archivePath, "."], { cwd: distDir });
}

function validateArchive() {
  const manifestVersion = execFileSync("unzip", ["-p", archivePath, "manifest.json"], {
    encoding: "utf8",
  });
  const archiveManifest = JSON.parse(manifestVersion);
  if (archiveManifest.version !== version) {
    fail(`Packaged manifest version ${archiveManifest.version} does not match ${version}.`);
  }

  const soundfontList = execFileSync(
    "unzip",
    ["-Z1", archivePath, "soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/*.mp3"],
    { encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  if (soundfontList.length !== 88) {
    fail(`Packaged archive should contain 88 piano soundfont MP3 files, found ${soundfontList.length}.`);
  }

  execFileSync("unzip", ["-tq", archivePath], { stdio: "inherit" });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(join(rootDir, filePath), "utf8"));
}

function assertFile(filePath) {
  if (!existsSync(join(rootDir, filePath))) fail(`Missing required release file: ${filePath}`);
}

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}