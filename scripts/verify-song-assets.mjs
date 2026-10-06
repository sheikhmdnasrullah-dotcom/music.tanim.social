import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = join(projectRoot, 'public');
const manifestPath = join(projectRoot, 'music', 'songs', 'before-i-learned-the-words', 'song.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const sectionIds = manifest.sections.map((section) => section.id);
const stems = manifest.audio.requiredStems;
const files = [
  ...manifest.audio.fullSong,
  ...sectionIds.flatMap((sectionId) => stems.map((stem) => `${sectionId}_${stem}.wav`)),
];

function inspectWav(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${relative(projectRoot, filePath)} is not a RIFF/WAVE file`);
  }

  const audioFormat = buffer.readUInt16LE(20);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  if (audioFormat !== 1 || channels < 1 || sampleRate === 0 || bitsPerSample !== 16) {
    throw new Error(`${relative(projectRoot, filePath)} must be PCM 16-bit audio`);
  }

  const dataOffset = buffer.indexOf(Buffer.from('data'), 36);
  if (dataOffset < 0) throw new Error(`${relative(projectRoot, filePath)} has no data chunk`);
  const dataBytes = buffer.readUInt32LE(dataOffset + 4);
  const duration = dataBytes / (sampleRate * channels * (bitsPerSample / 8));
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`${relative(projectRoot, filePath)} has no playable samples`);
  }
  return { channels, sampleRate, bitsPerSample, duration };
}

const failures = [];
for (const file of files) {
  const filePath = join(publicRoot, manifest.audio.root, file);
  if (!existsSync(filePath)) {
    failures.push(`${file}: missing`);
    continue;
  }
  try {
    const info = inspectWav(filePath);
    console.log(`${file}: ${info.duration.toFixed(3)}s, ${info.sampleRate}Hz, ${info.channels}ch`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  console.error('\nSong health failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`\nSong health passed: ${files.length} canonical WAV assets verified.`);
}
