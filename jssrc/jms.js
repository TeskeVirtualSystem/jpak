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

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 

  var JMS = function(volumeTable, fileTable, producerId, flags, userflags) {
    this.volumeTable = volumeTable || {};
    this.fileTable = fileTable || new JPAK.Classes.JPKDirectoryEntry("root");
    this.producerId = producerId || 0;
    this.userflags = userflags || 0;
    this.MAGIC = "JMS1";
  };

  JMS.prototype.toObject = JPAK.Generics.genericToObject;
  JMS.prototype.fromObject = JPAK.Generics.genericFromObject;
  JMS.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JMS.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  JMS.prototype.fromBinary = function(data) {
    if (inNode) 
      data = JPAK.Tools.toArrayBuffer(data);
    
    var MagicNumber = (new Uint8Array(data.slice(0,4))).asString();

    if (MagicNumber !== this.MAGIC) {
      console.error("MagicNumber doesn't match! Expected: "+this.MAGIC+" got "+MagicNumber);
      return;
    }

    var dV = new DataView(data);
    var fileTableOffset = dV.getUint32(data.byteLength-4);
    var volumeTableSize = fileTableOffset - 0xC;
    var fileTableSize = data.byteLength - fileTableOffset - 12;
    var fileTable = (new Uint8Array(data.slice(fileTableOffset,data.byteLength-16))).asString();
    var volumes = (new Uint8Array(data.slice(0xC,volumeTableSize+0xC))).asString();
    var volumeTable = JSON.parse((new Uint8Array(data.slice(0xC,volumeTableSize+0xC))).asString());

    this.fileTable = new JPAK.Classes.JPKDirectoryEntry();
    this.fileTable.jFromJSON(fileTable);
    this.volumeTable = {};

    for (var v in volumeTable) {
      var newVolume = new JPAK.Classes.JPKVolumeEntry();
      newVolume.fromObject(volumeTable[v]);
      this.volumeTable[v] = newVolume;
    }
  };

  JMS.prototype.toBinary = function() {
    var fileTable = this.fileTable.jToJSON();

    var volumeTable = {};
    for (var v in this.volumeTable) {
      volumeTable[v] = this.volumeTable[v].toObject();
    }
    volumeTable = JSON.stringify(volumeTable);

    var buffer = new ArrayBuffer(12 + volumeTable.length + fileTable.length + 16);
    var u8 = new Uint8Array(buffer);
    var dv = new DataView(buffer);

    dv.setUint32(buffer.byteLength-16, this.producerId);
    dv.setUint32(buffer.byteLength-12, this.flags);
    dv.setUint32(buffer.byteLength-8, this.userflags);

    u8.putString(this.MAGIC);
    var fileTableOffset = u8.putString(0xC, volumeTable);
    u8.putString(fileTableOffset, fileTable);
    dv.setUint32(buffer.byteLength-4, fileTableOffset);

    return buffer;
  };

  if (inNode) {
    var fs = require("fs");
    var path = require("path");

   JMS.prototype.fromDirectory = function(folder, jds) {
      this.fileTable.fromDirectory(folder, jds);
    };

    JMS.prototype.fromArgs = function(args, jds) {
      for(var i in args) {
        var folder = args[i];
        console.log("Adding from arg "+folder);
        if(fs.lstatSync(folder).isDirectory()) {
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
      var fd = fs.openSync(filename, "w");
      var binData = this.toBinary();
      fs.writeSync(fd, JPAK.Tools.toBuffer(binData), 0, binData.byteLength);
      fs.closeSync(fd);
    };
  }

  JPAK.Classes.JMS = JMS;

}());