/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  const inNode = (typeof process !== 'undefined' && process.versions && process.versions.node);

  let fs, p;
  if (inNode) {
    fs = require('fs');
    p = require('path');
  }

  class Loader {
    constructor(parameters) {
      if (parameters !== undefined)
        this.jpakfile = parameters.file;

      this.tableLoaded = false;
    }

    _proceedJPAK1() {
      JPAK.Tools.d("JPAK1 Format");
      this.jpakType = "JPAK1";
      return this._p_getFileSize().then(() => this._p_jpak1_loadFileTable());
    }

    _proceedJMS1() {
      JPAK.Tools.d("JMS1 Format");
      this.jpakType = "JMS";
      return this._p_getFileSize().then(() => this._p_jms1_loadFileTable());
    }

    checkMagic(magic) {
      const Magic0 = JPAK.Tools.bytesToString(new Uint8Array(magic.slice(0,4)));
      const Magic1 = JPAK.Tools.bytesToString(new Uint8Array(magic.slice(0,5)));

      if (JPAK.Constants.MAGIC_TYPE.hasOwnProperty(Magic0))
        return JPAK.Constants.MAGIC_TYPE[Magic0];
      else if (JPAK.Constants.MAGIC_TYPE.hasOwnProperty(Magic1))
        return JPAK.Constants.MAGIC_TYPE[Magic1];
      else
        return null;
    }

    load() {
      const MagicLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: 0,
        partialTo: 5
      });

      return MagicLoader.start().then((data) => {
        const version = this.checkMagic(data);
        JPAK.Tools.d("Version: "+version);
        switch (version) {
          case JPAK.Constants.MAGIC_TYPE.JPAK1: return this._proceedJPAK1();
          case JPAK.Constants.MAGIC_TYPE.JMS1: return this._proceedJMS1();
          case null:
            JPAK.Tools.e("Invalid magic!");
            return Promise.reject(new Error("Invalid magic!"));
          default:
            JPAK.Tools.e("Invalid Magic Type to load: "+JPAK.Constants.REVERSE_MAGIC_TYPE[version]);
            return Promise.reject(new Error("Invalid Magic Type to load: "+JPAK.Constants.REVERSE_MAGIC_TYPE[version]));
        }
      });
    }

    findDirectoryEntry(path) {
      let base = this.fileTable;
      if (this.tableLoaded) {
        if (path !== "/") {
          path = JPAK.Tools.cleanArray(path.split("/"), "");
          let dir = "", ok = true;
          for (let i = 0; i < path.length; i++) {
            dir = path[i];
            if (dir in base.directories)
              base = base.directories[dir];
            else {
              ok = false;
              break;
            }
          }
          if (!ok)
            base = null;
        }
      }
      return base;
    }

    findFileEntry(path) {
      const pathblock = JPAK.Tools.cleanArray(path.split("/"), "");
      const filename = pathblock[pathblock.length-1];
      path = path.replace(filename,"");
      const base = this.findDirectoryEntry(path);
      if (base != null)
        if (filename in base.files)
          return base.files[filename];
      return undefined;
    }

    ls(path) {
      const out = { "files" : [], "dirs" : [] };
      if (this.tableLoaded) {
        const base = this.findDirectoryEntry(path);
        if (base != null) {
          for (const i in base.files)
            out.files.push(base.files[i]);
          for (const i in base.directories)
            out.dirs.push({"name" : base.directories[i].name, "numfiles": base.directories[i].numfiles});
        } else
          out.error = "Directory not found!";
      } else
        out.error = "Not loaded";
      return out;
    }

    getFile(path, mimeType) {
      switch (this.jpakType) {
        case "JPAK1": return this._p_jpak1_getFileBlob(path, mimeType);
        case "JMS": return this._p_jms1_getFileBlob(path, mimeType);
        default: return Promise.reject(new Error("Not a valid jpak file!"));
      }
    }

    getFileArrayBuffer(path, mimeType, offset, len) {
      switch (this.jpakType) {
        case "JPAK1": return this._p_jpak1_getFile(path, mimeType, offset, len);
        case "JMS": return this._p_jms1_getFile(path, mimeType, offset, len);
        default: return Promise.reject(new Error("Not a valid jpak file!"));
      }
    }

    getBase64File(path, mimeType) {
      return this.getFileArrayBuffer(path, mimeType).then((data) => {
        return JPAK.Tools.ArrayBufferToBase64(data);
      });
    }

    getHTMLDataURIFile(path, mimeType, encoding) {
      if (inNode) return Promise.reject(new Error("getHTMLDataURIFile is only available in browser"));
      return this.getBase64File(path, mimeType).then((data) => {
        if (data === undefined)
          throw new Error("Data is undefined!");

        if (encoding !== undefined && encoding !== null)
          return "data:"+mimeType+";charset="+encoding+";base64,"+data;
        else
          return "data:"+mimeType+";base64,"+data;
      });
    }

    getFileURL(path, mimeType) {
      if (inNode) return Promise.reject(new Error("getFileURL is only available in browser"));
      return this.getFile(path, mimeType).then((blob) => {
        if (blob !== undefined)
          return URL.createObjectURL(blob);
        else {
          JPAK.Tools.e("Error: Cannot find file: \""+path+"\"");
          throw new Error("Error: Cannot find file: \""+path+"\"");
        }
      });
    }

    /** Promises **/

    _p_getFileSize() {
      const SizeLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        fetchSize: true
      });

      return SizeLoader.start().then((size) => {
        this.fileSize = size;
        JPAK.Tools.d("File Size: "+size);
        return size;
      });
    }

    _p_jpak1_loadFileTable() {
      const tableOffsetLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: this.fileSize-4,
        partialTo: this.fileSize
      });

      return tableOffsetLoader.start().then((data) => {
        this.fileTableOffset = new DataView(data).getUint32(0, true);
        const fileTableLoader = new JPAK.Tools.DataLoader({
          url: this.jpakfile,
          partial: true,
          partialFrom: this.fileTableOffset,
          partialTo: this.fileSize - 5
        });
        return fileTableLoader.start();
      }).then((data) => {
        data = JPAK.Tools.bytesToString(new Uint8Array(data));
        this.fileTable = JSON.parse(data);
        this.tableLoaded = true;
        return this.fileTable;
      });
    }

    _p_jpak1_getFile(path, mimeType, offset, len) {
      const file = this.findFileEntry(path);
      mimeType = mimeType || 'application/octet-binary';

      if (file == null)
        return Promise.reject(new Error("File does not exist!"));

      offset = offset || 0;
      len = len || file.size;

      const fileLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: file.offset + offset,
        partialTo: file.offset + offset + len - 1
      });

      return fileLoader.start().then((data) => {
        if (file.compressed !== undefined && file.compressed)
          data = JPAK.Tools.GZ.decompress(data);
        return data;
      });
    }

    _p_jpak1_getFileBlob(path, mimeType) {
      return this._p_jpak1_getFile(path, mimeType).then((data) => {
        let ret = new Uint8Array(data).buffer;
        if (!inNode)
          ret = new Blob([ret], {"type": mimeType});
        return ret;
      });
    }

    _p_jms1_loadFileTable() {
      const tableOffsetLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: this.fileSize-4,
        partialTo: this.fileSize
      });

      return tableOffsetLoader.start().then((data) => {
        this.fileTableOffset = new DataView(data).getUint32(0, true);
        const fileTableLoader = new JPAK.Tools.DataLoader({
          url: this.jpakfile,
          partial: true,
          partialFrom: this.fileTableOffset,
          partialTo: this.fileSize - 16 - 1
        });
        return fileTableLoader.start();
      }).then((data) => {
        data = JPAK.Tools.bytesToString(new Uint8Array(data));
        this.fileTable = JSON.parse(data);
        this.tableLoaded = true;

        const volumeTableLoader = new JPAK.Tools.DataLoader({
          url: this.jpakfile,
          partial: true,
          partialFrom: 0xC,
          partialTo: this.fileTableOffset - 1
        });
        return volumeTableLoader.start();
      }).then((data) => {
        data = JPAK.Tools.bytesToString(new Uint8Array(data));
        this.volumeTable = JSON.parse(data);
        this.volumeTableLoaded = true;
        return this.fileTable;
      });
    }

    _p_jms1_getFile(path, mimeType, offset, len) {
      const file = this.findFileEntry(path);
      mimeType = mimeType || 'application/octet-binary';

      if (file == null)
        return Promise.reject(new Error("File does not exist!"));

      offset = offset || 0;
      len = len || file.size;

      if (file.volume in this.volumeTable) {
        let volumePath = this.volumeTable[file.volume].filename;
        if (inNode) {
          volumePath = p.resolve(p.dirname(this.jpakfile), volumePath);
        }
        const fileLoader = new JPAK.Tools.DataLoader({
          url: volumePath,
          partial: true,
          partialFrom: file.offset + offset,
          partialTo: file.offset + offset + len - 1
        });

        return fileLoader.start().then((data) => {
          if (file.compressed !== undefined && file.compressed)
            data = JPAK.Tools.GZ.decompress(data);
          return data;
        });
      } else {
        return Promise.reject(new Error("Volume \""+file.volume+"\" not found!"));
      }
    }

    _p_jms1_getFileBlob(path, mimeType) {
      return this._p_jms1_getFile(path, mimeType).then((data) => {
        let ret = new Uint8Array(data).buffer;
        if (!inNode)
          ret = new Blob([ret], {"type": mimeType});
        return ret;
      });
    }
  }

  JPAK.Loader = Loader;

})();
