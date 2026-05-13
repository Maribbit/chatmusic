import { readFileSync } from "node:fs";

const packageJson = readJson("package.json");
const manifestJson = readJson("manifest.json");
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const maxChromeVersionPart = 65535;

const errors = [];

validateVersion("package.json", packageJson.version);
validateVersion("manifest.json", manifestJson.version);

if (packageJson.version !== manifestJson.version) {
  errors.push(
    `Version mismatch: package.json has ${packageJson.version}, manifest.json has ${manifestJson.version}.`
  );
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Version ${packageJson.version} is valid and synchronized.`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function validateVersion(fileName, version) {
  if (typeof version !== "string" || !versionPattern.test(version)) {
    errors.push(
      `${fileName} version must use numeric X.Y.Z format for Chrome extension releases.`
    );
    return;
  }

  const parts = version.split(".").map(Number);
  for (const part of parts) {
    if (part > maxChromeVersionPart) {
      errors.push(
        `${fileName} version part ${part} exceeds Chrome's ${maxChromeVersionPart} limit.`
      );
    }
  }
}