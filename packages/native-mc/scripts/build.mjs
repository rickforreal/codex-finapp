import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (command, args) =>
  spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

const cargoProbe = run('cargo', ['--version']);
if (cargoProbe.status !== 0) {
  console.warn('[native-mc] cargo not found; skipping native build.');
  process.exit(0);
}

const buildResult = run('cargo', ['build', '--release']);
if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const platform = process.platform;
const artifactName =
  platform === 'darwin'
    ? 'libfinapp_native_mc.dylib'
    : platform === 'win32'
      ? 'finapp_native_mc.dll'
      : 'libfinapp_native_mc.so';
const sourceArtifact = join(process.cwd(), 'target', 'release', artifactName);
const destinationArtifact = join(process.cwd(), 'index.node');

if (!existsSync(sourceArtifact)) {
  console.warn(`[native-mc] built artifact not found at ${sourceArtifact}; skipping copy.`);
  process.exit(0);
}

copyFileSync(sourceArtifact, destinationArtifact);
console.log(`[native-mc] copied ${artifactName} to index.node`);
