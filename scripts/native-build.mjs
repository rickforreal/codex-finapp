import { spawnSync } from 'node:child_process';

const probe = spawnSync('cargo', ['--version'], {
  stdio: 'ignore',
  shell: false,
});

if (probe.status !== 0) {
  console.warn('[native] cargo not found; skipping native build hook.');
  process.exit(0);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCmd, ['run', 'build', '-w', '@finapp/native-mc'], {
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
