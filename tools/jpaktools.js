/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/racerxdl/jpak

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
  var JPAK = {};

  Uint8Array.prototype.asString = function() {
    var o = "";
    for(var i=0;i<this.byteLength;i++)  
        o += String.fromCharCode(this[i]);
    return o;
  };

  Uint8Array.prototype.putString = function(offset, string) {
    if (string === undefined) {
      string = offset;
      offset = 0;
    }
    for (var i=0;i<string.length;i++) {
      this[offset+i] = string.charCodeAt(i);
    }
    return offset+string.length;
  };

  function genericToObject() {
    var output = {};
    for (var property in this) {
      if (this.hasOwnProperty(property)) {
        output[property] = this[property].toObject !== undefined ? this[property].toObject() : this[property];
      }
    }

    return output;
  }

  function genericFromObject(object) {
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        this[property] = object[property];
      }
    }
  }

  function genericjToJSON() {
    return JSON.stringify(this.toObject());
  }

  function genericjFromJSON(json) {
    this.fromObject(JSON.parse(json));
  }

  var JPKVolumeEntry = function(filename) {
    this.filename = filename;
  };

  JPKVolumeEntry.prototype.toObject = genericToObject;
  JPKVolumeEntry.prototype.fromObject = genericFromObject;
  JPKVolumeEntry.prototype.jToJSON = genericjToJSON;
  JPKVolumeEntry.prototype.jFromJSON = genericjFromJSON;

  var JPKFileEntry = function(name, path, offset, size, aeskey, zlib, volume, md5) {
    this.name = name || "";
    this.path = path || "";
    this.offset = offset || 0;
    this.size = size || 0;
    this.aeskey = aeskey || "";
    this.zlib = zlib || false;
    this.volume = volume || "";
    this.md5 = md5 || "";
  };

  JPKFileEntry.prototype.toObject = genericToObject;
  JPKFileEntry.prototype.fromObject = genericFromObject;
  JPKFileEntry.prototype.jToJSON = genericjToJSON;
  JPKFileEntry.prototype.jFromJSON = genericjFromJSON;

  var JPKDirectoryEntry = function(name, path, numfiles, directories, files, aeskey) {
    this.name = name || "";
    this.path = path || "";
    this.numfiles = numfiles || 0;
    this.directories = directories || {};
    this.aeskey = aeskey || "";
    this.files = files || {};    
  };

  JPKDirectoryEntry.prototype.toObject = genericToObject;
  JPKDirectoryEntry.prototype.fromObject = genericFromObject;
  JPKDirectoryEntry.prototype.jToJSON = genericjToJSON;
  JPKDirectoryEntry.prototype.jFromJSON = genericjFromJSON;

  var JMS = function(volumeTable, fileTable, producerId, flags, userflags) {
    this.volumeTable = volumeTable || {};
    this.fileTable = fileTable || new JPKDirectoryEntry("root");
    this.producerId = producerId || 0;
    this.userflags = userflags || 0;
    this.MAGIC = "JMS1";
  }

  JMS.prototype.toObject = genericToObject;
  JMS.prototype.fromObject = genericFromObject;
  JMS.prototype.jToJSON = genericjToJSON;
  JMS.prototype.jFromJSON = genericjFromJSON;

  JMS.prototype.fromBinary = function(data) {
    if (inNode) 
      data = toArrayBuffer(data);
    
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

    this.fileTable = new JPKDirectoryEntry();
    this.fileTable.jFromJSON(fileTable);
    this.volumeTable = {};

    for (var v in volumeTable) {
      var newVolume = new JPKVolumeEntry();
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

    function toBuffer(ab) {
      var buffer = new Buffer(ab.byteLength);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
      return buffer;
    }

    function toArrayBuffer(buffer) {
      var ab = new ArrayBuffer(buffer.length);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
      }
      return ab;
    }

    JPKDirectoryEntry.prototype.fromDirectory = function(folder, jds) {
      if(fs.lstatSync(folder).isDirectory()) {
        var folders = fs.readdirSync(folder);
        for (var fn in folders) {
          var f = folders[fn];
          if (fs.lstatSync(folder+"/"+f).isFile()) {
            this.addFile(folder+"/"+f, jds);
          } else if (fs.lstatSync(folder+"/"+f).isDirectory()) {
            if (!this.directories.hasOwnProperty(path.basename(f)))
              this.directories[path.basename(f)] = new JPKDirectoryEntry(path.basename(f));

            this.directories[path.basename(f)].fromDirectory(folder+"/"+f, jds);
          }
        }
      } else
        this.addFile(folder, jds);
    };

    JPKDirectoryEntry.prototype.addFile = function(filepath, jds, normalizeName) {
      console.log(" Adding "+(normalizeName ? path.basename(filepath) : filepath)+" to "+this.name);
      var addedData = jds.addFromFile(filepath);
      this.files[path.basename(filepath)] = new JPKFileEntry(path.basename(filepath), normalizeName ? path.basename(filepath) : filepath, addedData.offset, addedData.size);
      this.numfiles++;
    };

    JMS.prototype.fromDirectory = function(folder, jds) {
      this.fileTable.fromDirectory(folder, jds);
    };

    JMS.prototype.fromArgs = function(args, jds) {
      for(var i in args) {
        var folder = args[i];
        console.log("Adding from arg "+folder);
        if(fs.lstatSync(folder).isDirectory()) {
            if (!this.fileTable.directories.hasOwnProperty(path.basename(folder)))
              this.fileTable.directories[path.basename(folder)] = new JPKDirectoryEntry(path.basename(folder));

            this.fileTable.directories[path.basename(folder)].fromDirectory(folder, jds);
        } else
          this.fileTable.addFile(folder, jds, true);
      }
    };

    JMS.prototype.addVolume = function (jds) {
      if (jds.name in this.volumeTable) {
        console.error(jds.name+" already in volumes list.");
        return;
      }

      this.volumeTable[jds.name] = new JPKVolumeEntry(jds.filename);
    };

    JMS.prototype.toFile = function (filename) {
      var fd = fs.openSync(filename, "w");
      var binData = this.toBinary();
      fs.writeSync(fd, toBuffer(binData), 0, binData.byteLength);
      fs.closeSync(fd);
    };
  }

  var JDS = function(name, filename) {
    this.MAGIC = "JDS1";
    this.name = name || "";
    this.filename = filename || "";
    if (fs.existsSync(filename) && fs.statSync(filename).isFile())
      this.fd = fs.openSync(filename, "r+");
    else 
      this.fd = fs.openSync(filename, "w+");

    if (fs.statSync(filename)["size"] < 12)
      this.__buildHeader();
    this.currentPosition = 12; 
    this.CHUNK = 4096
  };

  JDS.prototype.__buildHeader = function() {
    console.log("Creating Header in "+this.filename);
    fs.writeSync(this.fd, this.MAGIC);
    fs.writeSync(this.fd, "\x00\x00\x00\x00\x00\x00\x00\x00");
  };

  JDS.prototype.add = function(data) {
    var offset = this.currentPosition;
    var o = fs.writeSync(this.fd, data);
    this.currentPosition += o;
    return [offset, data.length];
  };

  JDS.prototype.addFromFile = function(filename) {
    var newFd = fs.openSync(filename, "r");
    var offset = this.currentPosition;
    var size = fs.statSync(filename)["size"];
    var c = 0;
    var data = new Buffer(this.CHUNK);
    while ( c < size ) {
      var chunk = size - c > this.CHUNK ? this.CHUNK : size - c;
      var r = fs.readSync(newFd, data, 0, chunk);
      fs.writeSync(this.fd, data, chunk);
      c += chunk;
      this.currentPosition += chunk;
    }
    fs.closeSync(newFd);
    return [offset, size];
  };

  JDS.prototype.close = function() {
    fs.closeSync(this.fd);
  };

  JPAK.JMS = JMS;
  JPAK.JDS = JDS;
  JPAK.JPKDirectoryEntry = JPKDirectoryEntry;
  JPAK.JPKFileEntry = JPKFileEntry;
  JPAK.JPKVolumeEntry = JPKVolumeEntry;

  if (inNode)
    module.exports.JPAK = JPAK;
  else
    window.JPAK = JPAK;

}());