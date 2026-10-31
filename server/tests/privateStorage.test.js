const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createPrivateStorage } = require('../src/services/privateStorage');

test('local evidence storage stores, streams, and deletes private files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sharegrid-storage-'));
  const filePath = path.join(directory, 'upload');
  await fs.writeFile(filePath, 'private evidence');
  const storage = createPrivateStorage(directory);

  try {
    const stored = await storage.storeFile({ filename: 'upload', path: filePath });
    assert.deepEqual(stored, { storedName: 'upload', storageProvider: 'local' });

    const body = await storage.getFile(stored.storageProvider, stored.storedName);
    const chunks = [];
    for await (const chunk of body) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), 'private evidence');

    await storage.deleteFile(stored.storageProvider, stored.storedName);
    await assert.rejects(fs.access(filePath), { code: 'ENOENT' });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('local evidence storage rejects keys that escape its private directory', async () => {
  const storage = createPrivateStorage(path.join(os.tmpdir(), 'sharegrid-private'));
  await assert.rejects(storage.getFile('local', '..\\outside'), (error) => error.status === 404);
});

test('local evidence storage rejects files from retired storage providers', async () => {
  const storage = createPrivateStorage(path.join(os.tmpdir(), 'sharegrid-private'));
  await assert.rejects(storage.getFile('s3', 'evidence/object'), (error) => error.status === 410);
});
