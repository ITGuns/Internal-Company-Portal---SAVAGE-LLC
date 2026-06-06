import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const lockPath = path.join(repoRoot, "skills", "skills-lock.json");
const allowedSourceTypes = new Set(["github", "local"]);

function formatRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function resolveRepoPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") {
    throw new Error("skillPath must be a non-empty string");
  }

  const resolvedPath = path.resolve(repoRoot, relativePath);
  const relative = path.relative(repoRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`skillPath escapes the repository: ${relativePath}`);
  }

  return resolvedPath;
}

async function sha256(filePath) {
  const file = await readFile(filePath, "utf8");
  return createHash("sha256").update(file.replaceAll("\r\n", "\n")).digest("hex");
}

async function main() {
  const lock = JSON.parse(await readFile(lockPath, "utf8"));

  if (lock.version !== 1) {
    throw new Error(`Unsupported skills lock version: ${lock.version}`);
  }

  if (!lock.skills || typeof lock.skills !== "object" || Array.isArray(lock.skills)) {
    throw new Error("skills-lock.json must contain a skills object");
  }

  const failures = [];
  const entries = Object.entries(lock.skills);

  for (const [name, skill] of entries) {
    if (!skill || typeof skill !== "object") {
      failures.push(`${name}: skill entry must be an object`);
      continue;
    }

    if (!allowedSourceTypes.has(skill.sourceType)) {
      failures.push(`${name}: sourceType must be one of ${[...allowedSourceTypes].join(", ")}`);
    }

    if (typeof skill.source !== "string" || skill.source.trim() === "") {
      failures.push(`${name}: source must be a non-empty string`);
    }

    if (typeof skill.computedHash !== "string" || !/^[a-f0-9]{64}$/i.test(skill.computedHash)) {
      failures.push(`${name}: computedHash must be a SHA-256 hex string`);
      continue;
    }

    let skillPath;
    try {
      skillPath = resolveRepoPath(skill.skillPath);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
      continue;
    }

    try {
      const actualHash = await sha256(skillPath);
      if (actualHash.toLowerCase() !== skill.computedHash.toLowerCase()) {
        failures.push(
          `${name}: hash mismatch for ${formatRelative(skillPath)} ` +
            `(expected ${skill.computedHash.toLowerCase()}, got ${actualHash})`,
        );
      }
    } catch (error) {
      failures.push(`${name}: cannot read ${formatRelative(skillPath)} (${error.message})`);
    }
  }

  if (failures.length > 0) {
    console.error("Skill lock validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Skill lock validation passed for ${entries.length} skills.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
