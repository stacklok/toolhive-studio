import { mkdir, access, writeFile, chmod } from "node:fs/promises";
import { createReadStream } from "node:fs"; // Only for unzipping
import path from "node:path";
import * as tar from "tar";
import unzipper from "unzipper";
import { TOOLHIVE_VERSION } from "./constants";

// If using Node < 18, uncomment the next line and run: npm i node-fetch@^3
// import fetch from 'node-fetch';

const mapOS: Partial<Record<NodeJS.Platform, string>> = {
  win32: "windows",
  darwin: "darwin",
  linux: "linux",
};

const mapArch: Record<string, string> = {
  x64: "amd64",
  arm64: "arm64",
};

export async function ensureThv(
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch,
): Promise<string> {
  const os = mapOS[platform];
  const cpu = mapArch[arch];
  if (!os || !cpu) throw new Error(`Unsupported combo ${platform}/${arch}`);

  const ext = os === "windows" ? "zip" : "tar.gz";

  // GitHub tag always starts with "v", filename never has it.
  const tag = TOOLHIVE_VERSION.startsWith("v")
    ? TOOLHIVE_VERSION
    : `v${TOOLHIVE_VERSION}`;
  const versionNum = TOOLHIVE_VERSION.startsWith("v")
    ? TOOLHIVE_VERSION.slice(1)
    : TOOLHIVE_VERSION;

  const assetName = `toolhive_${versionNum}_${os}_${cpu}.${ext}`;
  const url = `https://github.com/stacklok/toolhive/releases/download/${tag}/${assetName}`;

  const binDir = path.resolve(
    __dirname,
    "..",
    "..",
    "bin",
    `${platform}-${arch}`,
  );
  const binPath = path.join(binDir, os === "windows" ? "thv.exe" : "thv");

  try {
    await access(binPath);
    return binPath;
  } catch {
    /* not found */
  }

  console.log(`↧ downloading ${assetName} …`);
  await mkdir(binDir, { recursive: true });

  // ---------- download ----------
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) – ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const archivePath = path.join(binDir, assetName);
  await writeFile(archivePath, buf);

  // ---------- extract ----------
  if (ext === "zip") {
    await createReadStream(archivePath)
      .pipe(unzipper.Extract({ path: binDir }))
      .promise();
  } else {
    await tar.x({ file: archivePath, cwd: binDir });
  }

  await chmod(binPath, 0o755);
  return binPath;
}
