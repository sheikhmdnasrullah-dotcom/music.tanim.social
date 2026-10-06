import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { statfsSync } from 'node:fs';

function command(name, args) {
  try {
    return execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const memoryGiB = os.totalmem() / 1024 ** 3;
const nvidia = command('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader']);
const python = command('python3', ['--version']) ?? command('python', ['--version']);
const disk = statfsSync(process.cwd());
const diskGiB = (disk.bavail * disk.bsize) / 1024 ** 3;

const report = {
  platform: `${process.platform}/${process.arch}`,
  cpu: os.cpus()[0]?.model ?? 'unknown',
  cpuCores: os.cpus().length,
  memoryGiB: Number(memoryGiB.toFixed(1)),
  freeDiskGiB: Number(diskGiB.toFixed(1)),
  python: python ?? 'not found',
  nvidiaGpu: nvidia ?? 'not detected',
  yue2Eligible: process.platform === 'linux' && Boolean(nvidia) && memoryGiB >= 24,
};

console.log(JSON.stringify(report, null, 2));
if (!report.yue2Eligible) {
  console.log(
    '\nYuE2 is not locally eligible on this machine. Use a configured Linux/NVIDIA model service; do not simulate generation.',
  );
}
