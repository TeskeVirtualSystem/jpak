     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 

**JPAK** is a multi-use JavaScript Package System for loading several files at once from a single package. Works in both browser and Node.js (>= 18).

## Install

```sh
npm install @teskevirtualsystem/jpak
```

## Usage

```js
import { JPAK } from '@teskevirtualsystem/jpak';
// or: const { JPAK } = require('@teskevirtualsystem/jpak');
// or: <script src="dist/jpak.min.js"></script>  (window.JPAK)

const pkg = new JPAK.Loader({ file: 'package.jms' });
pkg.load().then(() => {
  pkg.getFileURL('/logo.png', 'image/png').then(url => {
    document.body.innerHTML += `<img src="${url}">`;
  });
});
```

## Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| JPAK 1.0 | `.jpak` | Monolithic package (data + JSON file table appended) |
| JPAK 2.0 EXT / JMS | `.jms` + `.jds` | Metadata + volume data stores, supporting partial loading and volume spanning |

## API

```js
const pkg = new JPAK.Loader({ file: 'package.jms' });

// Load metadata
await pkg.load();

// List directory contents
const listing = pkg.ls('/');
// { files: [...], dirs: [...] }

// Get file as Blob (browser) or ArrayBuffer (Node.js)
const blob = await pkg.getFile('/test.html', 'text/html');

// Get file as ArrayBuffer (both browser and Node.js)
const ab = await pkg.getFileArrayBuffer('/test.html', 'text/html');

// Get file as base64 string
const b64 = await pkg.getBase64File('/test.png', 'image/png');

// Get file as data URI (browser only)
const uri = await pkg.getHTMLDataURIFile('/test.html', 'text/html');

// Get file URL (browser only, creates object URL from blob)
const url = await pkg.getFileURL('/test.png', 'image/png');
```

## Creating packages

### JPAK 1.0

```sh
pip install -r tools/requirements.txt
python3 tools/packer1.py myfolder/
# produces myfolder.jpak
```

### JPAK 2.0 EXT / JMS

```sh
python3 tools/packer.py 0 0 0 "" myfolder/
# or use the JS packer:
node tools/extpacker.js package.jms volume.jds myfolder/*
```

## Development

```sh
npm install
npm run build          # builds dist/jpak.js, dist/jpak.min.js, dist/jpak.mjs
npm run lint           # jshint on source files
npm test               # build + run 47 tests
```

## License

MIT
