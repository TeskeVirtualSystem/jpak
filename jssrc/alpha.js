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
  Constants: {
    verbosity: 3  //  0 - Error, 1 - Warning, 2 - Info, 3 - Debug
  },
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


  /**
   * Clean all deletedValue from array
   */
  JPAK.Tools.cleanArray = function(array, deleteValue) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === deleteValue) {         
        array.splice(i, 1);
        i--;
      }
    }
    return array;
  };

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

  JPAK.Constants.Base64_Encoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  /**
   * Returns a Base64 String from an ArrayBuffer
   * Modified version from https://gist.github.com/jonleighton/958841
   */
  JPAK.Tools.ArrayBufferToBase64 = function(arrayBuffer)  {
    var base64    = '';

    var bytes         = new Uint8Array(arrayBuffer);
    var byteLength    = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength    = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63;               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + JPAK.Constants.Base64_Encoding[c] + JPAK.Constants.Base64_Encoding[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4; // 3   = 2^2 - 1

      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + '==';
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + JPAK.Constants.Base64_Encoding[c] + '=';
    }

    return base64;
  };

  JPAK.Tools.debug = function() {
    if (JPAK.Constants.verbosity >= 3) {
      [].splice.call(arguments, 0, 0, "(JPAK Debug)");
      if (console.debug)
        console.debug.apply(console, arguments);
      else
        console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.error = function() {
    if (JPAK.Constants.verbosity >= 0) {
      [].splice.call(arguments, 0, 0, "(JPAK Error)");
      if (console.error)
        console.error.apply(console, arguments);
      else
        console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.warning = function() {
    if (JPAK.Constants.verbosity >= 1) {
      [].splice.call(arguments, 0, 0, "(JPAK Warning)");
      console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.info = function() {
    if (JPAK.Constants.verbosity >= 2) {
      [].splice.call(arguments, 0, 0, "(JPAK Info)");
      if (console.info)
        console.info.apply(console, arguments);
      else
        console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.d = JPAK.Tools.debug;
  JPAK.Tools.e = JPAK.Tools.error;
  JPAK.Tools.w = JPAK.Tools.warning;
  JPAK.Tools.i = JPAK.Tools.info;
  JPAK.Tools.l = JPAK.Tools.info;
  JPAK.Tools.log = JPAK.Tools.info;

  JPAK.Constants.MAGIC_TYPE = {
    "JPAK1": 0,
    "JMS1": 1,
    "JDS1": 2
  };

  JPAK.Constants.REVERSE_MAGIC_TYPE = {
    0: "JPAK1",
    1: "JMS1",
    2: "JDS1"
  };

})();