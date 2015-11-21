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

  var JPKDirectoryEntry = function(name, path, numfiles, directories, files, aeskey) {
    this.name = name || "";
    this.path = path || "";
    this.numfiles = numfiles || 0;
    this.directories = directories || {};
    this.aeskey = aeskey || "";
    this.files = files || {};    
  };

  JPKDirectoryEntry.prototype.toObject = JPAK.Generics.genericToObject;
  JPKDirectoryEntry.prototype.fromObject = JPAK.Generics.genericFromObject;
  JPKDirectoryEntry.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JPKDirectoryEntry.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  if (inNode) {

    var fs = require("fs");
    var path = require("path");

    JPKDirectoryEntry.prototype.fromDirectory = function(folder, jds) {
      if(fs.lstatSync(folder).isDirectory()) {
        var folders = fs.readdirSync(folder);
        for (var fn in folders) {
          var f = folders[fn];
          if (fs.lstatSync(folder+"/"+f).isFile()) {
            this.addFile(folder+"/"+f, jds);
          } else if (fs.lstatSync(folder+"/"+f).isDirectory()) {
            if (!this.directories.hasOwnProperty(path.basename(f)))
              this.directories[path.basename(f)] = new JPAK.Classes.JPKDirectoryEntry(path.basename(f));

            this.directories[path.basename(f)].fromDirectory(folder+"/"+f, jds);
          }
        }
      } else
        this.addFile(folder, jds);
    };

    JPKDirectoryEntry.prototype.addFile = function(filepath, jds, normalizeName) {
      console.log(" Adding "+(normalizeName ? path.basename(filepath) : filepath)+" to "+this.name);
      var addedData = jds.addFromFile(filepath);
      this.files[path.basename(filepath)] = new JPAK.Classes.JPKFileEntry(path.basename(filepath), normalizeName ? path.basename(filepath) : filepath, addedData.offset, addedData.size, "", false, jds.name);
      this.numfiles++;
    };

  }

  JPAK.Classes.JPKDirectoryEntry = JPKDirectoryEntry;
})();