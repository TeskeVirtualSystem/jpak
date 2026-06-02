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

const JPAK = {
  Constants: {
    verbosity: 3  //  0 - Error, 1 - Warning, 2 - Info, 3 - Debug
  },
  Generics: {},
  Loader: {},
  Classes: {},
  Tools : {}
};

(function() {

  const inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined');

  if (inNode) {
    const { Buffer } = require('buffer');

    JPAK.Tools.toBuffer = function(ab) {
      const buffer = Buffer.alloc(ab.byteLength);
      const view = new Uint8Array(ab);
      for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
      return buffer;
    };

    JPAK.Tools.toArrayBuffer = function(buffer) {
      const ab = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(ab);
      for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
      }
      return ab;
    };
  }

  /**
   * Convert a Uint8Array to a string (replaces old Uint8Array.prototype.asString)
   */
  JPAK.Tools.bytesToString = function(bytes) {
    let o = "";
    for (let i = 0; i < bytes.byteLength; i++)
      o += String.fromCharCode(bytes[i]);
    return o;
  };

  /**
   * Put a string into a Uint8Array at a given offset.
   * Returns the byte position after the written string.
   * (replaces old Uint8Array.prototype.putString)
   */
  JPAK.Tools.stringToBytes = function(uint8, offset, string) {
    if (string === undefined) {
      string = offset;
      offset = 0;
    }
    for (let i = 0; i < string.length; i++) {
      uint8[offset + i] = string.charCodeAt(i);
    }
    return offset + string.length;
  };

  /**
   * Convert a string to an ArrayBuffer
   */
  JPAK.Tools.stringToArrayBuffer = function(str) {
    const ab = new ArrayBuffer(str.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return ab;
  };

  /**
   * Clean all deletedValue from array
   */
  JPAK.Tools.cleanArray = function(array, deleteValue) {
    for (let i = 0; i < array.length; i++) {
      if (array[i] === deleteValue) {
        array.splice(i, 1);
        i--;
      }
    }
    return array;
  };

  /*
   *  Converts itself to an object.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericToObject = function() {
    const output = {};
    for (const property in this) {
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
    for (const property in object) {
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
    let base64 = '';

    const bytes = new Uint8Array(arrayBuffer);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let a, b, c, d;
    let chunk;

    for (let i = 0; i < mainLength; i = i + 3) {
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      a = (chunk & 16515072) >> 18;
      b = (chunk & 258048)   >> 12;
      c = (chunk & 4032)     >>  6;
      d = chunk & 63;

      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + JPAK.Constants.Base64_Encoding[c] + JPAK.Constants.Base64_Encoding[d];
    }

    if (byteRemainder === 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2;

      b = (chunk & 3)   << 4;

      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + '==';
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10;
      b = (chunk & 1008)  >>  4;

      c = (chunk & 15)    <<  2;

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
