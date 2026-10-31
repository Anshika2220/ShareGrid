const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/sharegrid-storage-tests';
process.env.JWT_SECRET = 'sharegrid-storage-test-secret-with-at-least-32-characters';

const { createPrivateStorage } = require('../src/services/privateStorage');

test('S3-compatible storage writes, streams, and deletes private evidence', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sharegrid-storage-'));
  const filePath = path.join(directory, 'upload');
  await fs.writeFile(filePath, 'private evidence');
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);
      if (command.constructor.name === 'PutObjectCommand') {
        const chunks = [];
        for await (const chunk of command.input.Body) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString(), 'private evidence');
        return {};
      }
      if (command.constructor.name === 'GetObjectCommand') return { Body: Readable.from([Buffer.from('private evidence')]) };
      return {};
    }
  };
  const storage = createPrivateStorage({
    driver: 's3', bucket: 'sharegrid-private', region: 'us-east-1', directory
  }, client);

  try {
    const stored = await storage.storeFile({
      path: filePath, filename: 'temporary-upload', size: 16, mimetype: 'application/pdf'
    });
    assert.equal(stored.storageProvider, 's3');
    assert.match(stored.storedName, /^evidence\/[0-9a-f-]{36}$/);
    await assert.rejects(fs.access(filePath), { code: 'ENOENT' });

    const body = await storage.getFile(stored.storageProvider, stored.storedName);
    const chunks = [];
    for await (const chunk of body) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), 'private evidence');

    await storage.deleteFile(stored.storageProvider, stored.storedName);
    assert.deepEqual(commands.map((command) => command.constructor.name), [
      'PutObjectCommand', 'GetObjectCommand', 'DeleteObjectCommand'
    ]);
    assert.equal(commands[0].input.Bucket, 'sharegrid-private');
    assert.equal(commands[1].input.Key, stored.storedName);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('local evidence storage rejects keys that escape its private directory', async () => {
  const storage = createPrivateStorage({ driver: 'local', directory: path.join(os.tmpdir(), 'sharegrid-private') });
  await assert.rejects(storage.getFile('local', '..\\outside'), (error) => error.status === 404);
});
