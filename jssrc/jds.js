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

  const inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined');
  if (inNode) {

    const fs = require("fs");
    const path = require("path");

    class JDS {
      constructor(name, filename) {
        this.MAGIC = "JDS1";
        this.name = name || "";
        this.filename = filename || "";
        if (fs.existsSync(filename) && fs.statSync(filename).isFile())
          this.fd = fs.openSync(filename, "r+");
        else
          this.fd = fs.openSync(filename, "w+");

        if (fs.statSync(filename).size < 12)
          this.__buildHeader();
        this.currentPosition = 12;
        this.CHUNK = 4096;
      }

      __buildHeader() {
        console.log("Creating Header in "+this.filename);
        fs.writeSync(this.fd, this.MAGIC);
        fs.writeSync(this.fd, "\x00\x00\x00\x00\x00\x00\x00\x00");
      }

      add(data) {
        const offset = this.currentPosition;
        const o = fs.writeSync(this.fd, data);
        this.currentPosition += o;
        return [offset, data.length];
      }

      addFromFile(filename) {
        const newFd = fs.openSync(filename, "r");
        const offset = this.currentPosition;
        const size = fs.statSync(filename).size;
        let c = 0;
        const data = Buffer.alloc(this.CHUNK);
        while (c < size) {
          const chunk = size - c > this.CHUNK ? this.CHUNK : size - c;
          fs.readSync(newFd, data, 0, chunk);
          fs.writeSync(this.fd, data, 0, chunk, this.currentPosition);
          c += chunk;
          this.currentPosition += chunk;
        }
        fs.closeSync(newFd);
        return [offset, size];
      }

      close() {
        fs.closeSync(this.fd);
      }
    }

    JPAK.Classes.JDS = JDS;
  }

})();
