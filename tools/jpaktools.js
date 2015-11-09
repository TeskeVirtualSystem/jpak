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

  function genericToJSON() {
    return JSON.stringify(this.toObject());
  }

  function genericFromJSON(json) {
    this.fromObject(JSON.parse(json));
  }

  var JPKVolumeEntry = function(filename) {
    this.filename = filename;
  };

  JPKVolumeEntry.prototype.toObject = genericToObject;
  JPKVolumeEntry.prototype.fromObject = genericFromObject;
  JPKVolumeEntry.prototype.toJSON = genericToJSON;
  JPKVolumeEntry.prototype.fromJSON = genericFromJSON;

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
  JPKFileEntry.prototype.toJSON = genericToJSON;
  JPKFileEntry.prototype.fromJSON = genericFromJSON;

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
  JPKDirectoryEntry.prototype.toJSON = genericToJSON;
  JPKDirectoryEntry.prototype.fromJSON = genericFromJSON;

  var JMS = function(volumeTable, fileTable, producerId, flags, userflags) {
    this.volumeTable = volumeTable || {};
    this.fileTable = fileTable || new JPKDirectoryEntry("root");
    this.producerId = producerId || 0;
    this.userflags = userflags || 0;
    this.MAGIC = "JMS1";
  }

  JMS.prototype.toObject = genericToObject;
  JMS.prototype.fromObject = genericFromObject;
  JMS.prototype.toJSON = genericToJSON;
  JMS.prototype.fromJSON = genericFromJSON;

  JMS.prototype.fromBinary = function(data) {
    var MagicNumber = (new Uint8Array(data.slice(0,4)).asString();
    if (MagicNumber !== this.MAGIC) {
      console.error("MagicNumber doesn't match! Expected: "+this.MAGIC+" got "+MagicNumber);
      return;
    }
    var dV = new DataView(data);
    var fileTableOffset = dV.getUint32(data.byteLength-4));
    var volumeTableSize = fileTableSize - 0xC;
    var fileTableSize = data.byteLength - fileTableOffset - 12;
    var fileTable = (new Uint8Array(data.slice(filetableoffset,data.byteLength-4))).asString();
    var volumeTable = JSON.parse((new Uint8Array(data.slice(0xC,volumeTableSize+0xC))).asString());

    this.fileTable = new JPKDirectoryEntry();
    this.fileTable.fromJSON(fileTable);
    this.volumeTable = {};

    for (var v in volumeTable) {
      var newVolume = new JPKVolumeEntry();
      newVolume.fromObject(volumeTable(v));
      this.volumes[v] = newVolume;
    }
  };

  JMS.prototype.toBinary = function() {
    var fileTable = this.fileTable.toJSON();
    
    var volumeTable = {};
    for (var v in this.volumeTable) {
      volumeTable[v] = this.volumeTable[v].toObject();
    }
    volumeTable = JSON.stringify(volumeTable);

    var buffer = new ArrayBuffer(12 + volumeTable.length + fileTable.length + 16);
    var u8 = new Uint8Array(buffer);
    var dV = new DataView(buffer);

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

    JPKDirectoryEntry.prototype.fromDirectory = function(folder, jds) {
      if(fs.lstatSync(folder).isDirectory()) {
        var folders = fs.readdirSync(folder);
        for (var f in folders) {
          if (fs.lstatSync(folder+"/"+f).isFile())
            this.addFile(folder+"/"+f, jds);
          else if (fs.lstatSync(folder).isDirectory()) {
            var newdir = new JPKDirectoryEntry(f);
            newdir.fromDirectory(folder+"/"+f, jds);
            this.directories[f] = newdir;
          }
        }
      } else
        this.addFile(folder, jds);
    };

    JPKDirectoryEntry.prototype.addFile = function(filepath, jds) {
      var addedData = jds.addFromFile(folder);
      this.files[path.basename(folder)] = new JPKFileEntry(path.basename(folder), folder, addedData.offset, addedData.size);
      this.numfiles++;
    };

    JMS.prototype.fromDirectory = function(folder, jds) {
      this.fileTable.fromDirectory(folder, jds);
    };

    JMS.prototype.addVolume = function (jds) {
      if (jds.name in this.volumes) {
        console.error(jds.name+" already in volumes list.");
        return;
      }

      this.volumes[jds.name] = new JPKVolumeEntry(jds.filename);
    };
  }

  if (inNode)
    module.exports.JPAK = JPAK;
  else
    window.JPAK = JPAK;

}());