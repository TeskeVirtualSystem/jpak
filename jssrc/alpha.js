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

var JPAK = {
  Generics: {},
  Loader: {},
  Classes: {},
  Tools : {}
};

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 

  if (inNode) {
    JPAK.Tools.toBuffer = function(ab) {
      var buffer = new Buffer(ab.byteLength);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
      return buffer;
    };

    JPAK.Tools.toArrayBuffer = function(buffer) {
      var ab = new ArrayBuffer(buffer.length);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
      }
      return ab;
    };
  }

  /*
   *  Extends the Uint8Array to be able to be converted to a string
   */
  Uint8Array.prototype.asString = function() {
    var o = "";
    for(var i=0;i<this.byteLength;i++)  
        o += String.fromCharCode(this[i]);
    return o;
  };

  /*
   *  Puts a string inside the UInt8Array
   */
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

  /*
   *  Converts itself to an object.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericToObject = function() {
    var output = {};
    for (var property in this) {
      if (this.hasOwnProperty(property)) {
        output[property] = this[property].toObject !== undefined ? this[property].toObject() : this[property];
      }
    }
    return output;
  };

  /*
   *  Fills its own properties based on a input object.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericFromObject = function(object) {
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        this[property] = object[property];
      }
    }
  };


  /*
   *  Converts itself to a JSON.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericjToJSON = function() {
    return JSON.stringify(this.toObject());
  };


  /*
   *  Fills its own properties based on a json
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericjFromJSON = function(json) {
    this.fromObject(JSON.parse(json));
  };


})();