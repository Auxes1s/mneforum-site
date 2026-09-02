import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPendingSpeakerRecords() {
  const rosterPath = path.join(projectRoot, 'data', 'resource-person-roster.json');
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  return roster.roster
    .filter(record => record.status === 'pending_confirmation')
    .map(record => {
      const sessionId = record.sessionIds[0];
      const session = roster.sessions.find(item => item.id === sessionId);
      const displayName = record.displayName || record.organization;
      const affiliation = displayName === record.organization ? '' : record.organization;
      return `  { name: ${JSON.stringify(displayName)}, org: ${JSON.stringify(affiliation)}, role: ${JSON.stringify(record.role)}, sessionId: ${JSON.stringify(sessionId)}, wave: ${JSON.stringify(session ? session.wave : record.wave)}, photo: "", objectPosition: "50% 50%", status: "pending_confirmation" }`;
    });
}

function replaceExactlyOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  const last = source.lastIndexOf(needle);
  if (first === -1 || first !== last) {
    throw new Error(`Expected exactly one ${label}; found ${first === -1 ? 0 : 'multiple'}.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

export function createDevPreview(productionHtml) {
  let preview = productionHtml;

  preview = replaceExactlyOnce(
    preview,
    '<meta name="robots" content="index,follow">',
    '<meta name="robots" content="noindex,nofollow">',
    'outer robots directive'
  );
  preview = replaceExactlyOnce(
    preview,
    "'<link rel=\"canonical\" href=\"https://mnenetwork.forum/\"><link rel=\"icon\"",
    "'<meta name=\"robots\" content=\"noindex,nofollow\"><link rel=\"canonical\" href=\"https://mnenetwork.forum/\"><link rel=\"icon\"",
    'unpacked-document canonical injection'
  );
  preview = replaceExactlyOnce(
    preview,
    'const speakerWaveOverride = new URLSearchParams(window.location.search).get("speakerWave");',
    'const speakerWaveOverride = "all"; // Full-layout reviewer preview.',
    'speaker reveal override'
  );
  preview = replaceExactlyOnce(
    preview,
    'const revealedSpeakerSessionIds = ["opening-closing", "plenary-1", "plenary-2"];',
    'const revealedSpeakerSessionIds = SPEAKER_SESSIONS.map(session => session.id);',
    'speaker session reveal override'
  );
  preview = replaceExactlyOnce(
    preview,
    'const speakerLaunchSummary = "The keynote and Forum voices, Plenary 1, and Plenary 2 lineups are now revealed. Breakout profiles remain concealed.";',
    'const speakerLaunchSummary = "Explore confirmed resource persons by session; pending entries are shown by agency.";',
    'development speaker summary'
  );

  const speakerBlockMatch = preview.match(/const SPEAKERS = \[[\s\S]*?\n\];/);
  if (!speakerBlockMatch) throw new Error('Expected the production speaker roster before adding pending preview entries.');
  const pendingRecords = loadPendingSpeakerRecords();
  const speakerBlockWithPending = speakerBlockMatch[0].replace(
    /\n\];$/,
    `,\n${pendingRecords.join(',\n')}\n];`
  );
  preview = replaceExactlyOnce(
    preview,
    speakerBlockMatch[0],
    speakerBlockWithPending,
    'development pending speaker roster'
  );
  preview = replaceExactlyOnce(
    preview,
    'Confirmed resource persons',
    'Resource persons',
    'development speaker heading'
  );
  preview = replaceExactlyOnce(
    preview,
    'Filter confirmed resource persons by session group',
    'Filter resource persons by session group',
    'development speaker filter label'
  );

  return preview;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const source = path.join(root, 'index.html');
  const destination = path.join(root, 'dev', 'index.html');
  // Git may check out the bundled production page with mixed CRLF/LF endings.
  // Normalize before transforming so the generated preview is byte-stable and
  // matches the release verifier on every platform.
  const productionHtml = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(destination, createDevPreview(productionHtml), 'utf8');
  process.stdout.write(`Synchronized ${path.relative(root, destination)} from ${path.relative(root, source)}.\n`);
}
