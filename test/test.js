'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

process.chdir(__dirname);

const { JPAK } = require('../dist/jpak.js');

const TEST_HTML = '<BR><BR><B>YEEEEEEEEEHAW! JPAK HTML!</B><BR><BR>\n';
const TEST_JS = 'alert("JS From JPAK!");\n';
const TEST_WHATS = 'This is a test folder for making the sample jpak file.\n';

describe('JPAK namespace', () => {
  it('has Constants, Generics, Loader, Classes, Tools', () => {
    assert.ok(JPAK.Constants);
    assert.ok(JPAK.Generics);
    assert.ok(JPAK.Loader);
    assert.ok(JPAK.Classes);
    assert.ok(JPAK.Tools);
  });

  it('has MAGIC_TYPE constants', () => {
    assert.equal(JPAK.Constants.MAGIC_TYPE.JPAK1, 0);
    assert.equal(JPAK.Constants.MAGIC_TYPE.JMS1, 1);
    assert.equal(JPAK.Constants.MAGIC_TYPE.JDS1, 2);
  });

  it('has all class constructors', () => {
    assert.ok(typeof JPAK.Classes.JPKDirectoryEntry === 'function');
    assert.ok(typeof JPAK.Classes.JPKFileEntry === 'function');
    assert.ok(typeof JPAK.Classes.JPKVolumeEntry === 'function');
    assert.ok(typeof JPAK.Loader === 'function');
  });

  it('Loader constructor accepts parameters', () => {
    const loader = new JPAK.Loader({ file: 'packtest.jms' });
    assert.equal(loader.jpakfile, 'packtest.jms');
    assert.equal(loader.tableLoaded, false);
  });
});

describe('JPAK.Tools utilities', () => {
  it('bytesToString converts Uint8Array to string', () => {
    const u8 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    assert.equal(JPAK.Tools.bytesToString(u8), 'Hello');
  });

  it('stringToBytes writes string into Uint8Array', () => {
    const u8 = new Uint8Array(10);
    const end = JPAK.Tools.stringToBytes(u8, 0, 'ABC');
    assert.equal(end, 3);
    assert.equal(u8[0], 65);
    assert.equal(u8[1], 66);
    assert.equal(u8[2], 67);
  });

  it('stringToBytes with single argument uses offset 0', () => {
    const u8 = new Uint8Array(10);
    JPAK.Tools.stringToBytes(u8, 'Hi');
    assert.equal(u8[0], 72);
    assert.equal(u8[1], 105);
  });

  it('stringToArrayBuffer creates correct buffer', () => {
    const ab = JPAK.Tools.stringToArrayBuffer('OK');
    const u8 = new Uint8Array(ab);
    assert.equal(u8[0], 79);
    assert.equal(u8[1], 75);
    assert.equal(ab.byteLength, 2);
  });

  it('cleanArray removes matching values', () => {
    const arr = ['a', '', 'b', '', 'c'];
    const cleaned = JPAK.Tools.cleanArray(arr, '');
    assert.deepEqual(cleaned, ['a', 'b', 'c']);
  });

  it('ArrayBufferToBase64 produces valid base64', () => {
    const ab = JPAK.Tools.stringToArrayBuffer('f');
    const b64 = JPAK.Tools.ArrayBufferToBase64(ab);
    assert.equal(b64, 'Zg==');
  });

  it('logging shortcuts exist', () => {
    assert.equal(JPAK.Tools.d, JPAK.Tools.debug);
    assert.equal(JPAK.Tools.e, JPAK.Tools.error);
    assert.equal(JPAK.Tools.w, JPAK.Tools.warning);
    assert.equal(JPAK.Tools.i, JPAK.Tools.info);
  });

  it('inNode toBuffer and toArrayBuffer round-trip', () => {
    const ab = JPAK.Tools.stringToArrayBuffer('test');
    const buf = JPAK.Tools.toBuffer(ab);
    assert.ok(Buffer.isBuffer(buf));
    const ab2 = JPAK.Tools.toArrayBuffer(buf);
    const u8 = new Uint8Array(ab2);
    assert.equal(JPAK.Tools.bytesToString(u8), 'test');
  });
});

describe('JPAK.Classes', () => {
  it('JPKDirectoryEntry creates directory with defaults', () => {
    const dir = new JPAK.Classes.JPKDirectoryEntry('mydir');
    assert.equal(dir.name, 'mydir');
    assert.equal(dir.numfiles, 0);
    assert.deepEqual(dir.directories, {});
    assert.deepEqual(dir.files, {});
  });

  it('JPKFileEntry creates file entry with offsets', () => {
    const file = new JPAK.Classes.JPKFileEntry('test.txt', '/test.txt', 100, 42, '', false, 'vol0');
    assert.equal(file.name, 'test.txt');
    assert.equal(file.offset, 100);
    assert.equal(file.size, 42);
    assert.equal(file.volume, 'vol0');
    assert.equal(file.zlib, false);
  });

  it('JPKFileEntry defaults to empty values', () => {
    const file = new JPAK.Classes.JPKFileEntry();
    assert.equal(file.name, '');
    assert.equal(file.offset, 0);
    assert.equal(file.size, 0);
    assert.equal(file.zlib, false);
  });

  it('JPKVolumeEntry creates volume with filename', () => {
    const vol = new JPAK.Classes.JPKVolumeEntry('data.jds');
    assert.equal(vol.filename, 'data.jds');
  });

  it('JPKDirectoryEntry.toObject serializes correctly', () => {
    const dir = new JPAK.Classes.JPKDirectoryEntry('root', '/', 1, {}, {});
    const obj = dir.toObject();
    assert.equal(obj.name, 'root');
    assert.equal(obj.numfiles, 1);
  });

  it('JPKDirectoryEntry.fromObject deserializes', () => {
    const dir = new JPAK.Classes.JPKDirectoryEntry();
    dir.fromObject({ name: 'loaded', numfiles: 5 });
    assert.equal(dir.name, 'loaded');
    assert.equal(dir.numfiles, 5);
  });
});

describe('JMS loader (packtest.jms)', () => {
  let loader;

  before(async () => {
    loader = new JPAK.Loader({ file: 'packtest.jms' });
    await loader.load();
  });

  it('detects JMS format', () => {
    assert.equal(loader.jpakType, 'JMS');
  });

  it('loads the file table', () => {
    assert.equal(loader.tableLoaded, true);
  });

  it('loads the volume table', () => {
    assert.equal(loader.volumeTableLoaded, true);
    assert.ok('packtest.jds' in loader.volumeTable);
  });

  it('ls("/") returns root directory listing', () => {
    const listing = loader.ls('/');
    assert.equal(listing.error, undefined);
    assert.ok(listing.files.length >= 2);
    assert.ok(listing.dirs.length >= 2);

    const filenames = listing.files.map(f => f.name).sort();
    assert.ok(filenames.includes('test.html'));
    assert.ok(filenames.includes('whatisthis'));

    const dirnames = listing.dirs.map(d => d.name).sort();
    assert.ok(dirnames.includes('img'));
    assert.ok(dirnames.includes('js'));
  });

  it('ls("/img") returns image directory', () => {
    const listing = loader.ls('/img');
    assert.equal(listing.error, undefined);
    const filenames = listing.files.map(f => f.name);
    assert.ok(filenames.includes('python-logo-official.png'));
    const dirnames = listing.dirs.map(d => d.name);
    assert.ok(dirnames.includes('a'));
  });

  it('ls("/nonexistent") returns error', () => {
    const listing = loader.ls('/nonexistent');
    assert.ok(listing.error);
  });

  it('findFileEntry locates files', () => {
    const entry = loader.findFileEntry('/img/python-logo-official.png');
    assert.ok(entry);
    assert.equal(entry.name, 'python-logo-official.png');
    assert.equal(entry.volume, 'packtest.jds');
  });

  it('findFileEntry returns undefined for missing files', () => {
    const entry = loader.findFileEntry('/does/not/exist.txt');
    assert.equal(entry, undefined);
  });

  it('getFile loads test.html content', async () => {
    const data = await loader.getFile('/test.html', 'text/html');
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, TEST_HTML);
  });

  it('getFile loads js/test.js content', async () => {
    const data = await loader.getFile('/js/test.js', 'text/plain');
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, TEST_JS);
  });

  it('getFile loads whatisthis content', async () => {
    const data = await loader.getFile('/whatisthis', 'text/plain');
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, TEST_WHATS);
  });

  it('getFile loads PNG image', async () => {
    const data = await loader.getFile('/img/python-logo-official.png', 'image/png');
    assert.ok(data instanceof ArrayBuffer);
    assert.ok(data.byteLength > 1000);
  });

  it('getFileArrayBuffer returns ArrayBuffer', async () => {
    const data = await loader.getFileArrayBuffer('/test.html', 'text/html');
    assert.ok(data instanceof ArrayBuffer);
  });

  it('getBase64File returns valid base64', async () => {
    const b64 = await loader.getBase64File('/test.html', 'text/html');
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 0);

    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    assert.equal(decoded, TEST_HTML);
  });

  it('getFile rejects on missing file', async () => {
    await assert.rejects(
      () => loader.getFile('/does/not/exist.txt'),
      /File does not exist/
    );
  });

  it('getFile with offset/length returns partial data', async () => {
    const data = await loader.getFileArrayBuffer('/whatisthis', 'text/plain', 0, 4);
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, 'This');
  });

  it('can load a file from a nested directory', async () => {
    const entry = loader.findFileEntry('/js/test.js');
    assert.ok(entry);
    assert.equal(entry.size, 24);
  });
});

describe('JPAK 1.0 loader (packtest.jpak)', () => {
  let loader;

  before(async () => {
    loader = new JPAK.Loader({ file: 'packtest.jpak' });
    await loader.load();
  });

  it('detects JPAK1 format', () => {
    assert.equal(loader.jpakType, 'JPAK1');
    assert.equal(loader.tableLoaded, true);
  });

  it('ls("/") returns root listing', () => {
    const listing = loader.ls('/');
    assert.equal(listing.error, undefined);
    const filenames = listing.files.map(f => f.name).sort();
    assert.ok(filenames.includes('test.html'));
    assert.ok(filenames.includes('whatisthis'));
  });

  it('getFile loads test.html', async () => {
    const data = await loader.getFile('/test.html', 'text/html');
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, TEST_HTML);
  });

  it('getFile loads PNG image', async () => {
    const data = await loader.getFile('/img/python-logo-official.png', 'image/png');
    assert.ok(data instanceof ArrayBuffer);
    assert.ok(data.byteLength > 1000);
  });

  it('getFile loads js/test.js', async () => {
    const data = await loader.getFile('/js/test.js', 'text/plain');
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, TEST_JS);
  });

  it('getFile loads /whatisthis', async () => {
    const data = await loader.getFile('/whatisthis', 'text/plain');
    const text = JPAK.Tools.bytesToString(new Uint8Array(data));
    assert.equal(text, TEST_WHATS);
  });

  it('getFile rejects on missing file', async () => {
    await assert.rejects(
      () => loader.getFile('/does/not/exist.txt'),
      /File does not exist/
    );
  });

  it('getBase64File round-trips correctly', async () => {
    const b64 = await loader.getBase64File('/test.html', 'text/html');
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    assert.equal(decoded, TEST_HTML);
  });
});

describe('Error handling', () => {
  it('Loader rejects on invalid file', async () => {
    const loader = new JPAK.Loader({ file: 'nonexistent.jms' });
    await assert.rejects(
      () => loader.load(),
      /Error loading file/
    );
  });

  it('Loader rejects on non-JPAK file', async () => {
    const notJpak = path.join(__dirname, 'test.js');
    const loader = new JPAK.Loader({ file: notJpak });
    await assert.rejects(
      () => loader.load(),
      /Invalid magic/
    );
  });

  it('getFile rejects before load', async () => {
    const loader = new JPAK.Loader({ file: 'packtest.jms' });
    await assert.rejects(
      () => loader.getFile('/test.html'),
      /Not a valid jpak file/
    );
  });

  it('getFileArrayBuffer rejects before load', async () => {
    const loader = new JPAK.Loader({ file: 'packtest.jms' });
    await assert.rejects(
      () => loader.getFileArrayBuffer('/test.html'),
      /Not a valid jpak file/
    );
  });
});
