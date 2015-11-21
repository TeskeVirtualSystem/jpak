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

  if (!inNode) {
    var DataLoader = function(parameters) {
      var _this = this;
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

      this.xhr.onprogress = function(e) {
        if (e.lengthComputable && _this.onprogress !== undefined)     {  
          var percentComplete = (( (e.loaded / e.total)*10000 ) >> 0)/100;  // Rounded percent to two decimal
          _this._reportProgress({"loaded":e.loaded,"total":e.total,"percent": percentComplete}); 
        } 
      };

      this.xhr.onload = function(e) {
        if (this.status >= 200 && this.status < 300) {
          if (_this.fetchSize) 
            _this._reportLoad(parseInt(this.getResponseHeader("Content-Length")));
          else
            _this._reportLoad(this.response);
        
        } else
          _this._reportError({"text":"Error loading file! HTTP Status Code: "+this.status,"errorcode": this.status});
      };

      this.xhr.onreadystatechange = function(e) {
        if (this.readyState === 4 && (this.status  < 200 || this.status >= 300)) {
          JPAK.Tools.e("Error loading url "+_this.url+" ("+this.status+"): "+this.statusText);
          _this._reportError({"text": this.statusText, "errorcode": this.status});
        }
      };
    };

    DataLoader.prototype._reportProgress = function(progress) {
      for (var cb in this.callbacks.progress)
        this.callbacks.progress[cb](progress); 
      this.def.notify(progress);
    };

    DataLoader.prototype._reportError = function(error) {
      for (var cb in this.callbacks.error)
        this.callbacks.error[cb](error); 
      this.def.reject(error);
    };

    DataLoader.prototype._reportLoad = function(data) {
      for (var cb in this.callbacks.load)
        this.callbacks.load[cb](data);
      this.def.resolve(data);
    };

    DataLoader.prototype.start = function() {
      if (this.fetchSize) {
        this.method = "HEAD";
        this.partial = false;
      }
      this.xhr.open(this.method, this.url, true);
      this.xhr.responseType = this.responseType;
      if (this.partial)
        this.xhr.setRequestHeader("Range", "bytes="+this.partialFrom+"-"+this.partialTo);
      this.def = Q.defer();
      this.xhr.send();
      return this.def.promise;
    };

    DataLoader.prototype.on = function(event, cb) {
      if (event in this.callbacks) 
        this.callbacks[event].push(function(data) {
          cb(data);
        });
    };

    JPAK.Tools.DataLoader = DataLoader;
  }

})();