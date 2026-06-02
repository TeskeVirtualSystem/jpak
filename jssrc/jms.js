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

  class JMS {
    constructor(volumeTable, fileTable, producerId, flags, userflags) {
      this.volumeTable = volumeTable || {};
      this.fileTable = fileTable || new JPAK.Classes.JPKDirectoryEntry("root");
      this.producerId = producerId || 0;
      this.flags = flags || 0;
      this.userflags = userflags || 0;
      this.MAGIC = "JMS1";
    }
  }

  JMS.prototype.toObject = JPAK.Generics.genericToObject;
  JMS.prototype.fromObject = JPAK.Generics.genericFromObject;
  JMS.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JMS.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  JMS.prototype.fromBinary = function(data) {
    if (inNode)
      data = JPAK.Tools.toArrayBuffer(data);

    const MagicNumber = JPAK.Tools.bytesToString(new Uint8Array(data.slice(0,4)));

    if (MagicNumber !== this.MAGIC) {
      console.error("MagicNumber doesn't match! Expected: "+this.MAGIC+" got "+MagicNumber);
      return;
    }

    const dV = new DataView(data);
    const fileTableOffset = dV.getUint32(data.byteLength-4, true);
    const volumeTableSize = fileTableOffset - 0xC;
    const fileTable = JPAK.Tools.bytesToString(new Uint8Array(data.slice(fileTableOffset,data.byteLength-16)));
    const volumeTableRaw = JPAK.Tools.bytesToString(new Uint8Array(data.slice(0xC,volumeTableSize+0xC)));
    const volumeTable = JSON.parse(volumeTableRaw);

    this.fileTable = new JPAK.Classes.JPKDirectoryEntry();
    this.fileTable.jFromJSON(fileTable);
    this.volumeTable = {};

    for (const v in volumeTable) {
      const newVolume = new JPAK.Classes.JPKVolumeEntry();
      newVolume.fromObject(volumeTable[v]);
      this.volumeTable[v] = newVolume;
    }
  };

  JMS.prototype.toBinary = function() {
    const fileTable = this.fileTable.jToJSON();

    const volumeTableObj = {};
    for (const v in this.volumeTable) {
      volumeTableObj[v] = this.volumeTable[v].toObject();
    }
    const volumeTable = JSON.stringify(volumeTableObj);

    const buffer = new ArrayBuffer(12 + volumeTable.length + fileTable.length + 16);
    const u8 = new Uint8Array(buffer);
    const dv = new DataView(buffer);

    dv.setUint32(buffer.byteLength-16, this.producerId, true);
    dv.setUint32(buffer.byteLength-12, this.flags, true);
    dv.setUint32(buffer.byteLength-8, this.userflags, true);

    JPAK.Tools.stringToBytes(u8, this.MAGIC);
    const fileTableOffset = JPAK.Tools.stringToBytes(u8, 0xC, volumeTable);
    JPAK.Tools.stringToBytes(u8, fileTableOffset, fileTable);
    dv.setUint32(buffer.byteLength-4, fileTableOffset, true);

    return buffer;
  };

  if (inNode) {
    const fs = require("fs");
    const path = require("path");

    JMS.prototype.fromDirectory = function(folder, jds) {
      this.fileTable.fromDirectory(folder, jds);
    };

    JMS.prototype.fromArgs = function(args, jds) {
      for (const i in args) {
        const folder = args[i];
        console.log("Adding from arg "+folder);
        if (fs.lstatSync(folder).isDirectory()) {
          if (!this.fileTable.directories.hasOwnProperty(path.basename(folder)))
            this.fileTable.directories[path.basename(folder)] = new JPAK.Classes.JPKDirectoryEntry(path.basename(folder));

          this.fileTable.directories[path.basename(folder)].fromDirectory(folder, jds);
        } else
          this.fileTable.addFile(folder, jds, true);
      }
    };

    JMS.prototype.addVolume = function (jds) {
      if (jds.name in this.volumeTable) {
        console.error(jds.name+" already in volumes list.");
        process.exit(1);
      }

      this.volumeTable[jds.name] = new JPAK.Classes.JPKVolumeEntry(jds.filename);
    };

    JMS.prototype.toFile = function (filename) {
      const fd = fs.openSync(filename, "w");
      const binData = this.toBinary();
      fs.writeSync(fd, JPAK.Tools.toBuffer(binData), 0, binData.byteLength);
      fs.closeSync(fd);
    };
  }

  JPAK.Classes.JMS = JMS;

})();
