# JPAK — Agent Guide

## Project overview

Multi-use JavaScript Package System with two formats:
- **JPAK 1.0** — monolithic package (data + JSON file table appended)
- **JPAK 2.0 EXT / JMS** — metadata (`*.jms`) + volume data stores (`*.jds`), supporting partial loading and volume spanning

JavaScript loader runs in **both browser and Node.js** (detected via `typeof module !== 'undefined'`).

## Directory layout

| Path | Purpose |
|------|---------|
| `jssrc/` | JS source files (concatenated in **alphabetical order** — `alpha.js` creates `JPAK` namespace, `zzzz.js` exports it) |
| `dist/` | Built output: `jpak.js` (UMD/CJS), `jpak.min.js` (minified UMD), `jpak.mjs` (ESM) |
| `tools/` | `build.js` (JS build), `packer.py` + `packer1.py` (JPAK 1.0/2.0 packers), `unpacker.py` (extract), `extpacker.js` (JMS), `jpaktool.py` (shared Python lib) |
| `cpp/` | C++ shared library (`libjpak.so`) with jsoncpp submodule |
| `test/` | Manual browser tests + `test_node.js` |

## Dev commands

```sh
npm install                       # install jshint + terser
npm run build                     # build dist/jpak.js, dist/jpak.min.js, dist/jpak.mjs
npm run lint                      # jshint on jssrc/*.js
npm test                          # build + run test_node.js
```

## Build chain

`tools/build.js` — concats all `jssrc/*.js` in alphabetical order, produces three outputs:
- `dist/jpak.js` — UMD bundle (works with `<script>` tag and `require()`)
- `dist/jpak.min.js` — minified UMD (terser, no mangling)
- `dist/jpak.mjs` — ES module (works with `import JPAK from '@teskevirtualsystem/jpak'` or `import { JPAK } from '@teskevirtualsystem/jpak'`)

No external dependencies at runtime (Q library replaced by native Promises).

## Python tools

```sh
pip install -r tools/requirements.txt    # pycryptodome
python3 tools/packer1.py folder/          # create JPAK 1.0 package
python3 tools/packer.py 0 0 0 "" folder/  # create JPAK 2.0 package
python3 tools/unpacker.py file.jpak       # extract any JPAK file
```

## CI / Publishing

- `ci.yml` — runs lint + test on push/PR to master (Node 18/20/22 matrix)
- `publish.yml` — triggered by `v*` tags or manual dispatch; runs full validation then `npm publish` via OIDC trusted publisher

**One-time setup on npmjs.com:** Package settings → Trusted Publisher → Add GitHub Actions, fill in:
- Owner: `TeskeVirtualSystem`
- Repo: `jpak`
- Workflow: `publish.yml`

No tokens needed — publishing authenticates via OIDC. Provenance is auto-generated.

To publish a release:
```sh
npm version patch|minor|major   # bumps version + creates git tag
git push --follow-tags          # triggers publish workflow
```

## Architecture notes

- `JPAK` global namespace split into `JPAK.Constants`, `JPAK.Generics`, `JPAK.Loader`, `JPAK.Classes`, `JPAK.Tools`
- File loading uses `Range` HTTP headers for partial reads (browser XHR) or `fs.read` with offset (Node)
- GZIP decompression code forked from JSXGraph, in `jssrc/zip.js`
- Verbosity controlled via `JPAK.Constants.verbosity` (0 error, 3 debug)
- C++ build: `make` in `cpp/` produces `libjpak.so` (requires `libcurl`, `libjsoncpp`)

## Testing

```sh
node test/test_node.js             # loads test/packtest.jms via Node loader
```

No test framework. Manual browser tests at `test/test_jpak.html` and `test_jms.html`.

## Conventions

- `const`/`let` for variables, `class` syntax for constructors
- Native Promises (`.then()` / `.catch()` chains, `Promise.reject()` for errors)
- `Uint8Array` utility functions: `JPAK.Tools.bytesToString()`, `JPAK.Tools.stringToBytes()`, `JPAK.Tools.stringToArrayBuffer()`
- `Buffer.alloc()` instead of deprecated `new Buffer()`
- `lowerCamelCase` for identifiers (except constructor names like `JPKDirectoryEntry`, `JPKFileEntry`)
- Git submodule: `cpp/jsoncpp` → `https://github.com/open-source-parsers/jsoncpp`
- Target: Node.js >= 18, modern browsers

## Generated code

`dist/jpak.js`, `dist/jpak.min.js`, and `dist/jpak.mjs` are build artifacts. Edit `jssrc/*.js` and run `npm run build`.
