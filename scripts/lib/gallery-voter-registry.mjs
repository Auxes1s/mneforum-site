import crypto from 'node:crypto';

const CODE_PATTERN = /^[2-9A-HJ-KM-NP-Z]{4}$/;
const FORMAT = 'mneforum-gallery-voter-registry';
const VERSION = 1;

export function parseCsvMatrix(text) {
  const source = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV ended inside a quoted field.');
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

export function parseCsv(text) {
  const rows = parseCsvMatrix(text);
  if (!rows.length) return [];
  const headers = rows[0].map(value => value.trim());
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate headers.');
  return rows.slice(1).filter(values => values.some(value => value !== '')).map((values, rowIndex) => {
    if (values.length > headers.length) throw new Error(`CSV row ${rowIndex + 2} has more fields than the header.`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function truthy(value, fallback = false) {
  const text = String(value ?? '').trim().toLowerCase();
  return text ? ['true', 'yes', '1', 'y'].includes(text) : fallback;
}

export function authorizationRecords(registryRows) {
  const required = ['vote_code', 'active', 'eligible_to_vote', 'authorized_google_email', 'bound_email'];
  if (!registryRows.length || required.some(field => !Object.hasOwn(registryRows[0], field))) {
    throw new Error('Participant registry is empty or missing voting authorization fields.');
  }
  const records = registryRows.map(row => ({
    vote_code: String(row.vote_code ?? '').replace(/\s/g, '').toUpperCase(),
    active: truthy(row.active),
    eligible_to_vote: truthy(row.eligible_to_vote, true),
    authorized_google_email: String(row.authorized_google_email ?? '').trim().toLowerCase(),
    bound_email: String(row.bound_email ?? '').trim().toLowerCase()
  }));
  const codes = records.map(record => record.vote_code);
  if (codes.some(code => !CODE_PATTERN.test(code)) || new Set(codes).size !== codes.length) {
    throw new Error('Participant registry contains an invalid or duplicate Voting Code.');
  }
  return records;
}

export function encryptRegistry(records, passphrase, createdAt = new Date().toISOString()) {
  if (String(passphrase).length < 24) throw new Error('Registry passphrase must contain at least 24 characters.');
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, 32, {N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024});
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify({format: FORMAT, version: VERSION, records}), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    format: FORMAT,
    version: VERSION,
    cipher: 'aes-256-gcm',
    kdf: {name: 'scrypt', N: 32768, r: 8, p: 1, salt: salt.toString('base64')},
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    record_count: records.length,
    created_at: createdAt
  };
}

export function decryptRegistry(bundle, passphrase) {
  if (bundle?.format !== FORMAT || bundle?.version !== VERSION || bundle?.cipher !== 'aes-256-gcm' || bundle?.kdf?.name !== 'scrypt') {
    throw new Error('Unsupported encrypted voter registry format.');
  }
  try {
    const salt = Buffer.from(bundle.kdf.salt, 'base64');
    const key = crypto.scryptSync(passphrase, salt, 32, {
      N: bundle.kdf.N, r: bundle.kdf.r, p: bundle.kdf.p, maxmem: 64 * 1024 * 1024
    });
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(bundle.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(bundle.tag, 'base64'));
    const payload = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(bundle.ciphertext, 'base64')), decipher.final()
    ]).toString('utf8'));
    if (payload.format !== FORMAT || payload.version !== VERSION || !Array.isArray(payload.records)) throw new Error('bad payload');
    return authorizationRecords(payload.records);
  } catch {
    throw new Error('Could not decrypt the voter registry; check the passphrase.');
  }
}

export const votingCodePattern = CODE_PATTERN;
