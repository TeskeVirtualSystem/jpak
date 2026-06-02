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

  if (!inNode) {
    class DataLoader {
      constructor(parameters) {
        this.xhr = new XMLHttpRequest();
        this.method = parameters.method || "GET";
        this.url = parameters.url;
        this.responseType = parameters.responseType || "arraybuffer";
        this.partial = parameters.partial  || false;
        this.partialFrom = parameters.partialFrom || 0;
        this.partialTo = parameters.partialTo || 0;
        this.fetchSize = parameters.fetchSize || false;

        this.callbacks = {
          "load" : [],
          "error" : [],
          "progress": []
        };

        this.xhr.onprogress = (e) => {
          if (e.lengthComputable && this.onprogress !== undefined) {
            const percentComplete = (( (e.loaded / e.total)*10000 ) >> 0)/100;
            this._reportProgress({"loaded":e.loaded,"total":e.total,"percent": percentComplete});
          }
        };

        this.xhr.onload = (e) => {
          if (this.xhr.status >= 200 && this.xhr.status < 300) {
            if (this.fetchSize)
              this._reportLoad(parseInt(this.xhr.getResponseHeader("Content-Length")));
            else
              this._reportLoad(this.xhr.response);
          } else
            this._reportError({"text":"Error loading file! HTTP Status Code: "+this.xhr.status,"errorcode": this.xhr.status});
        };

        this.xhr.onreadystatechange = (e) => {
          if (this.xhr.readyState === 4 && (this.xhr.status  < 200 || this.xhr.status >= 300)) {
            JPAK.Tools.e("Error loading url "+this.url+" ("+this.xhr.status+"): "+this.xhr.statusText);
            this._reportError({"text": this.xhr.statusText, "errorcode": this.xhr.status});
          }
        };
      }

      _reportProgress(progress) {
        for (const cb of this.callbacks.progress)
          cb(progress);
        if (this._notify)
          this._notify(progress);
      }

      _reportError(error) {
        const err = error instanceof Error ? error : new Error(error.text || String(error));
        if (error.errorcode != null) err.code = error.errorcode;
        for (const cb of this.callbacks.error)
          cb(err);
        if (this._reject)
          this._reject(err);
      }

      _reportLoad(data) {
        for (const cb of this.callbacks.load)
          cb(data);
        if (this._resolve)
          this._resolve(data);
      }

      start() {
        if (this.fetchSize) {
          this.method = "HEAD";
          this.partial = false;
        }
        this.xhr.open(this.method, this.url, true);
        this.xhr.responseType = this.responseType;
        if (this.partial)
          this.xhr.setRequestHeader("Range", "bytes="+this.partialFrom+"-"+this.partialTo);

        return new Promise((resolve, reject, notify) => {
          this._resolve = resolve;
          this._reject = reject;
          this._notify = notify;
          this.xhr.send();
        });
      }

      on(event, cb) {
        if (event in this.callbacks)
          this.callbacks[event].push(cb);
      }
    }

    JPAK.Tools.DataLoader = DataLoader;
  } else {
    const fs = require('fs');

    class NodeDataLoader {
      constructor(parameters) {
        this.url = parameters.url;
        this.partial = parameters.partial  || false;
        this.partialFrom = parameters.partialFrom || 0;
        this.partialTo = parameters.partialTo || 0;
        this.fetchSize = parameters.fetchSize || false;

        this.callbacks = {
          "load" : [],
          "error" : []
        };
      }

      _reportError(error) {
        const err = error instanceof Error ? error : new Error(error.text || String(error));
        if (error.errorcode != null) err.code = error.errorcode;
        for (const cb of this.callbacks.error)
          cb(err);
        if (this._reject)
          this._reject(err);
      }

      _reportLoad(data) {
        for (const cb of this.callbacks.load)
          cb(data);
        if (this._resolve)
          this._resolve(data);
      }

      start() {
        const _this = this;
        return new Promise((resolve, reject) => {
          _this._resolve = resolve;
          _this._reject = reject;

          if (_this.fetchSize) {
            fs.stat(_this.url, (err, stats) => {
              if (err) {
                _this._reportError({"text":"Error loading file! "+err});
              } else {
                _this._reportLoad(stats.size);
              }
            });
          } else {
            fs.open(_this.url, "r", (err, fd) => {
              if (err) {
                _this._reportError({"text":"Error loading file! "+err});
                return;
              }

              const getSize = () => {
                return new Promise((sizeResolve, sizeReject) => {
                  if (_this.partial) {
                    sizeResolve(_this.partialTo - _this.partialFrom + 1);
                  } else {
                    fs.fstat(fd, (err, stats) => {
                      if (err)
                        sizeReject(err);
                      else
                        sizeResolve(stats.size);
                    });
                  }
                });
              };

              getSize().then((readsize) => {
                return new Promise((loadResolve, loadReject) => {
                  const buffer = Buffer.alloc(readsize);
                  const position = _this.partial ? _this.partialFrom : 0;
                  fs.read(fd, buffer, 0, readsize, position, (err) => {
                    if (err)
                      loadReject(err);
                    else
                      loadResolve(buffer);
                  });
                });
              }).then((data) => {
                _this._reportLoad(JPAK.Tools.toArrayBuffer(data));
              }).catch((err) => {
                _this._reportError({"text":"Error loading file! "+err});
              });
            });
          }
        });
      }

      on(event, cb) {
        if (event in this.callbacks)
          this.callbacks[event].push(cb);
      }
    }

    JPAK.Tools.DataLoader = NodeDataLoader;
  }

})();
