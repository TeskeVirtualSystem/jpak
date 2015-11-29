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
  if (inNode)
    Q = require('q');

  var Loader = function(parameters) {
    if(parameters !== undefined)
        this.jpakfile = parameters.file;

    this.tableLoaded = false;
  };

  Loader.prototype._proceedJPAK1 = function() {
    var _this = this;
    JPAK.Tools.d("JPAK1 Format");
    this.jpakType = "JPAK1";
    return this._p_getFileSize().then(function(){return _this._p_jpak1_loadFileTable();});
  };

  Loader.prototype._proceedJMS1 = function() {
    var _this = this;
    this.jpakType = "JMS";
    JPAK.Tools.d("JMS1 Format");
    return this._p_getFileSize().then(function(){return _this._p_jms1_loadFileTable();});
  };

  Loader.prototype.checkMagic = function(magic) {
    var Magic0 = (new Uint8Array(magic.slice(0,4))).asString();
    var Magic1 = (new Uint8Array(magic.slice(0,5))).asString();

    if (JPAK.Constants.MAGIC_TYPE.hasOwnProperty(Magic0)) 
      return JPAK.Constants.MAGIC_TYPE[Magic0];
    else if (JPAK.Constants.MAGIC_TYPE.hasOwnProperty(Magic1))
      return JPAK.Constants.MAGIC_TYPE[Magic1];
    else
      return null;
  };

  Loader.prototype.load = function() {
    var _this = this;

    var MagicLoader = new JPAK.Tools.DataLoader({
      url: this.jpakfile,
      partial: true,
      partialFrom: 0,
      partialTo: 5
    });

    return MagicLoader.start().then(function(data) {
      var def = Q.defer();
      var version = _this.checkMagic(data);
      JPAK.Tools.d("Version: "+version);
      switch(version) {
        case JPAK.Constants.MAGIC_TYPE.JPAK1: return _this._proceedJPAK1();
        case JPAK.Constants.MAGIC_TYPE.JMS1: return _this._proceedJMS1();
        case null:
          JPAK.Tools.e("Invalid magic!");
          def.reject(); // TODO: Error passing
          break;
        default:
          JPAK.Tools.e("Invalid Magic Type to load: "+JPAK.Constants.REVERSE_MAGIC_TYPE[version]);
          def.reject(); // TODO: Error passing
      }
      return def.promise;
    });
  };

  /**
   * Gets the directory entry if exists.
   * Returns null if not found
   */
  Loader.prototype.findDirectoryEntry = function(path)   {
    var base = this.fileTable;
    if(this.tableLoaded) {
      if(path !== "/") {
        path = JPAK.Tools.cleanArray(path.split("/"), "");
        var dir = "", ok = true;
        for(var i=0;i<path.length;i++)    {
          dir = path[i];
          if(dir in base.directories)  
            base = base.directories[dir]; 
          else{
            ok = false;
            break;
          }
        }
        if(!ok)
          base = null;        
      }
    }
    return base;
  };

  /**
   * Gets the file entry if exists.
   * Returns null if not found
   */
  Loader.prototype.findFileEntry = function(path)    {
    var pathblock = JPAK.Tools.cleanArray(path.split("/"), "");
    var filename  = pathblock[pathblock.length-1];
    path = path.replace(filename,"");
    var base = this.findDirectoryEntry(path);
    if(base !== undefined)   
      if(filename in base.files)  
        return base.files[filename];
    return undefined;
  };

  /**
   * Lists the dir returning an object like:
   * { "dirs" : [ arrayofdirs ], "files" : [ arrayoffiles ], "error" : "An error message, if happens" }
   */
  Loader.prototype.ls = function(path)   {
    var out = { "files" : [], "dirs" : [] };
    if(this.tableLoaded) {
      var base = this.findDirectoryEntry(path);
      if(base !== undefined)  {
        for(var i in base.files)
          out.files.push(base.files[i]);
        for(i in base.directories)
          out.dirs.push({"name" : base.directories[i].name, "numfiles": base.directories[i].numfiles});
      }else
        out.error = "Directory not found!";
             
    }else
      out.error = "Not loaded";   
    return out;
  };

  Loader.prototype.getFile = function(path, type)  {
    var def = Q.defer();

    switch (this.jpakType) {
      case "JPAK1": return this._p_jpak1_getFileBlob(path, type);
      case "JMS": return this._p_jms1_getFileBlob(path, type);
      default: def.reject("Not a valid jpak file!"); 
    }

    return def.promise;
  };

  Loader.prototype.getFileArrayBuffer = function(path, type, offset, len) {
    var def = Q.defer();

    switch (this.jpakType) {
      case "JPAK1": return this._p_jpak1_getFile(path, type, offset, len);
      case "JMS": return this._p_jms1_getFile(path, type, offset, len);
      default: def.reject("Not a valid jpak file!"); 
    }

    return def.promise;
  };

  Loader.prototype.getBase64File = function(path, type) {
    var def = Q.defer();
    this.getFileArrayBuffer(path, type).then(function(data) {
      def.resolve(JPAK.Tools.ArrayBufferToBase64(data));
    }).fail(function(error) {
      def.reject(error);
    });

    return def.promise;
  };

  if (!inNode) {
    Loader.prototype.getHTMLDataURIFile = function(path, type, encoding) {
      var def = Q.defer();
      this.getBase64File(path, type).then(function(data) {
        // HTML Data URI Format: data:[<MIME-type>][;charset=<encoding>][;base64],<data>
        if(data === undefined)
          def.reject("Data is undefined!");
            
        if(encoding !== undefined && encoding !== null)
          def.resolve("data:"+type+";charset="+encoding+";base64,"+data);
        else
          def.resolve("data:"+type+";base64,"+data);
      });

      return def.promise;
    };
    
    Loader.prototype.getFileURL = function(path, type) {
      return this.getFile(path, type).then(function(blob) {
        var def = Q.defer();
        if (blob !== undefined) 
          def.resolve(URL.createObjectURL(blob));
        else {
          JPAK.Tools.e("Error: Cannot find file: \""+path+"\"");
          def.reject("Error: Cannot find file: \""+path+"\"");
        }
        return def.promise;
      });
    };
  }

  /** Promises **/

  Loader.prototype._p_getFileSize = function() {
    var _this = this;
    var SizeLoader = new JPAK.Tools.DataLoader({
      url: this.jpakfile,
      fetchSize: true
    });

    return SizeLoader.start().then(function(size) {
      var def = Q.defer();
      _this.fileSize = size;
      JPAK.Tools.d("File Size: "+size);
      def.resolve(size);
      return def.promise;
    });
  };

  Loader.prototype._p_jpak1_loadFileTable = function() {
    var _this = this;
    var tableOffsetLoader = new JPAK.Tools.DataLoader({
      url: this.jpakfile,
      partial: true,
      partialFrom: this.fileSize-4,
      partialTo: this.fileSize
    });

    return tableOffsetLoader.start().then(function(data) {
      _this.fileTableOffset = new DataView(data).getUint32(0, true);
      var fileTableLoader = new JPAK.Tools.DataLoader({
        url: _this.jpakfile,
        partial: true,
        partialFrom: _this.fileTableOffset,
        partialTo: _this.fileSize - 5
      });

      return fileTableLoader.start();
    }).then(function(data) {
      var def = Q.defer();
      data = (new Uint8Array(data)).asString();
      try {
        _this.fileTable = JSON.parse(data);
        _this.tableLoaded = true;
        def.resolve(_this.fileTable);
      } catch (e) {
        def.reject(e);
      }
      return def.promise;
    });
  };

  Loader.prototype._p_jpak1_getFile = function(path, type, offset, len) {
    var def = Q.defer();
    var file = this.findFileEntry(path);
    type = type || 'application/octet-binary';

    if (file === null || file === undefined)
      def.reject("File does not exists!");

    offset = offset || 0;
    len = len || file.size;

    var fileLoader = new JPAK.Tools.DataLoader({
      url: this.jpakfile,
      partial: true,
      partialFrom: file.offset + offset,
      partialTo: file.offset + len -1
    });

    fileLoader.start().then(function(data) {
      if(file.compressed !== undefined && file.compressed)
        data = JPAK.Tools.GZ.decompress(data);
      def.resolve(data);
    }).fail(function(error) {
      def.reject(error);
    });

    return def.promise;
  };

  Loader.prototype._p_jpak1_getFileBlob = function(path, type) {
    var def = Q.defer();

    this._p_jpak1_getFile(path, type).then(function (data) {
      var ret = new Uint8Array(data).buffer;
      if (!inNode)
        ret = new Blob([ret], {"type":type});
      def.resolve(ret);
    }).fail(function(error) {
      def.reject(error);
    });

    return def.promise;
  };

  Loader.prototype._p_jms1_loadFileTable = function() {
    var _this = this;
    var tableOffsetLoader = new JPAK.Tools.DataLoader({
      url: this.jpakfile,
      partial: true,
      partialFrom: this.fileSize-4,
      partialTo: this.fileSize
    });

    return tableOffsetLoader.start().then(function(data) {
      _this.fileTableOffset = new DataView(data).getUint32(0, true);
      var fileTableLoader = new JPAK.Tools.DataLoader({
        url: _this.jpakfile,
        partial: true,
        partialFrom: _this.fileTableOffset,
        partialTo: _this.fileSize - 16 -1
      });

      return fileTableLoader.start();
    }).then(function(data) {
      data = (new Uint8Array(data)).asString();
      _this.fileTable = JSON.parse(data);
      _this.tableLoaded = true;

      var volumeTableLoader = new JPAK.Tools.DataLoader({
        url: _this.jpakfile,
        partial: true,
        partialFrom: 0xC,
        partialTo: _this.fileTableOffset -1
      });

      return volumeTableLoader.start();

    }).then(function(data) {
      var def = Q.defer();
      data = (new Uint8Array(data)).asString();
      _this.volumeTable = JSON.parse(data);
      _this.volumeTableLoaded = true;
      def.resolve(_this.fileTable);
      return def.promise;        
    });
  };

  Loader.prototype._p_jms1_getFile = function(path, type, offset, len) {
    var def = Q.defer();
    var file = this.findFileEntry(path);
    type = type || 'application/octet-binary';

    offset = offset || 0;
    len = len || file.size;

    if (file === null || file === undefined)
      def.reject("File does not exists!");

    if (file.volume in this.volumeTable) {
      var volumePath = this.volumeTable[file.volume].filename;
      var fileLoader = new JPAK.Tools.DataLoader({
        url: volumePath,
        partial: true,
        partialFrom: file.offset + offset,
        partialTo: file.offset + len -1
      });

      fileLoader.start().then(function(data) {
        if(file.compressed !== undefined && file.compressed)
          data = JPAK.Tools.GZ.decompress(data);
        def.resolve(data);
      }).fail(function(error) {
        def.reject(error);
      });
    } else {
      def.reject("Volume \""+file.volume+"\" not found!");
    }

    return def.promise;
  };

  Loader.prototype._p_jms1_getFileBlob = function(path, type) {
    var def = Q.defer();

    this._p_jms1_getFile(path, type).then(function (data) {
      var ret = new Uint8Array(data).buffer;
      if (!inNode)
        ret = new Blob([ret], {"type":type});
      def.resolve(ret);
    }).fail(function(error) {
      def.reject(error);
    });

    return def.promise;
  };

  JPAK.Loader = Loader;

})();