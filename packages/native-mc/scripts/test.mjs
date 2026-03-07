import { spawnSync } from 'node:child_process';

const probe = spawnSync('cargo', ['--version'], { stdio: 'inherit', shell: false });
if (probe.status !== 0) {
  console.warn('[native-mc] cargo not found; skipping native tests.');
  process.exit(0);
}

const testResult = spawnSync('cargo', ['test', '--release'], { stdio: 'inherit', shell: false });
process.exit(testResult.status ?? 1);
