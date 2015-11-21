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

  JPKFileEntry.prototype.toObject = JPAK.Generics.genericToObject;
  JPKFileEntry.prototype.fromObject = JPAK.Generics.genericFromObject;
  JPKFileEntry.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JPKFileEntry.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  JPAK.Classes.JPKFileEntry = JPKFileEntry;

})();