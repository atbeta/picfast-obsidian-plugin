import { readFileSync, writeFileSync } from "fs";

const target = process.argv[2] || process.env.npm_package_version;
const manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
const versions = JSON.parse(readFileSync("versions.json", "utf-8"));

if (!target) {
  console.error("version-bump: missing target version");
  process.exit(1);
}

manifest.version = target;
versions[target] = manifest.minAppVersion;

writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");
writeFileSync(
  "versions.json",
  JSON.stringify(versions, null, "\t") + "\n",
);

console.log(`version-bump: manifest -> ${target}`);