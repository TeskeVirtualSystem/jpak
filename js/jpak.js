
/*
     _ ____   _    _  __        _   ___  
    | |  _ \ / \  | |/ / __   _/ | / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / || | | |
| |_| |  __/ ___ \| . \   \ V /| || |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_(_)___/ 
                                         
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak
*/

/*  IE10 Hack for ArrayBuffer Slice */
if(!ArrayBuffer.prototype.slice)    {
    ArrayBuffer.prototype.slice = function(start,end)   {
        var arr = ArrayBuffer(end-start);
        var uchar = new Uint8Array(this);
        var uchar2 = new Uint8Array(arr);
        var c = 0;
        for(var i=start;i<end;i++)  {
            uchar2[c] = uchar[i];
            c++;
        }
        return arr;
    };
};

/*  Clean all deleteValue from array    */
Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

/*  Start of JPAK Class Stuff   */
var JPAK = function()   {};

// Enable this to show Debug Messages
JPAK.ShowMessages = false;

// Auxiliary functions
//  Convert Unsigned Int 8 Array Buffer to String 
JPAK.Uint8ArrayToString = function(uintArray) {
    var o = "";
    for(var i=0;i<uintArray.byteLength;i++)  
        o += String.fromCharCode(uintArray[i]);
    return o;
}

var u8as = JPAK.Uint8ArrayToString; //  Provided for compatibility

JPAK.Base64_Encoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Modified version from https://gist.github.com/jonleighton/958841
JPAK.ArrayBufferToBase64 = function(arrayBuffer)  {
  var base64    = ''

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += JPAK.Base64_Encoding[a] + JPAK.Base64_Encoding[b] + JPAK.Base64_Encoding[c] + JPAK.Base64_Encoding[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += JPAK.Base64_Encoding[a] + JPAK.Base64_Encoding[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += JPAK.Base64_Encoding[a] + JPAK.Base64_Encoding[b] + JPAK.Base64_Encoding[c] + '='
  }

  return base64
};

JPAK.log = function(msg)    {
    if(JPAK.ShowMessages)
        console.log(msg);
}

// JPAKLoader
JPAK.jpakloader = function(parameters)  {
    if(parameters !== undefined)    {
        this.jpakfile = parameters.file;
        this.loadall  = parameters.loadall || false;    //  TODO: Implement the fetch-on-need feature
    }
};

// Variables
JPAK.jpakloader.prototype.dataloaded    =   false;      //  Set to true, when file is loaded
JPAK.jpakloader.prototype.filecache     =   [];         //  The cached files that we loaded

//  Searches a file on the cache
JPAK.jpakloader.prototype.CacheLoad     =   function(path)  {
    for(var i=0;i<this.filecache.length;i++)    {
        if(this.filecache[i].path == path)
            return this.filecache[i];
    }
    return undefined;
};

//  Loads the jpak file and process it
JPAK.jpakloader.prototype.Load = function() {
    if(this.jpakfile !== undefined) {
        // _this is used to reference the jpakloader object
        var _this = this;
        
        //  Lets create a new XMLHttpRequest to load the jpak
        var xhr = new XMLHttpRequest();
        
        xhr.open('GET', this.jpakfile, true);
        xhr.responseType = 'arraybuffer';       //  We want an ArrayBuffer for processing
        
        //  The On Progress request. For now it only does stuff if there is a hooked onprogress jpakloader event.
        xhr.onprogress = function(e)    {
            if (e.lengthComputable && _this.onprogress != undefined)     {  
                var percentComplete = (( (e.loaded / e.total)*10000 ) >> 0)/100;  // Rounded percent to two decimal
                    _this.onprogress({"loaded":e.loaded,"total":e.total,"percent": percentComplete});                
            }   
        }
        
        //  The onload function. This parses the JPAK and after loading the filetable it calls the onload event of jpakloader
        xhr.onload = function(e) {
            if (this.status == 200) {
                var data = this.response;
                var MagicNumber = u8as(new Uint8Array(data.slice(0,5)));
                if(MagicNumber == "JPAK1")  {
                    JPAK.log("JPAK::jpakloader - Loaded file "+_this.jpakfile+" successfully. JPAK1 Format");
                    var filetableoffset = new DataView(data.slice(data.byteLength-4,data.byteLength)).getUint32(0, true);
                    var filetable = new Uint8Array(data.slice(filetableoffset,data.byteLength-4));
                    filetable = JSON.parse(u8as(filetable));
                    _this.filetable = filetable;
                    _this.jpakdata = data;
                    _this.dataloaded = true;
                    if(_this.onload != undefined)   
                        _this.onload();
                }else{
                    JPAK.log("JPAK::jpakloader - Error loading file "+_this.jpakfile+" (8000): Wrong File Magic. Expected JPAK1 got "+MagicNumber);
                    if(_this.onerror != undefined)
                        _this.onerror({"text": "Wrong File Magic. Expected JPAK1 got "+MagicNumber, "errorcode" : 8000}); 
                }
            }
        };
        xhr.onreadystatechange = function (aEvt) {
            if (this.readyState == 4) {
                if(this.status != 200)   {
                    JPAK.log("JPAK::jpakloader - Error loading file "+_this.jpakfile+" ("+this.status+"): "+this.statusText);
                    if(_this.onerror != undefined)
                        _this.onerror({"text": this.statusText, "errorcode": this.status});
                }
          }
        };
        //  Send the request
        xhr.send();  
    }else
        console.log("JPAK::jpakloader - No file to load!");
};

//  Gets the directory entry if exists.
JPAK.jpakloader.prototype.FindDirectoryEntry = function(path)   {
    var base = this.filetable;
    if(this.dataloaded) {
        if(path != "/") {
            path = path.split("/").clean("");
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
                base = undefined;        
        }
    }
    return base;
};

//  Gets the file entry if exists.
JPAK.jpakloader.prototype.FindFileEntry = function(path)    {
    var pathblock = path.split("/").clean("");
    var filename  = pathblock[pathblock.length-1];
    path = path.replace(filename,"");
    var base = this.FindDirectoryEntry(path);
    if(base != undefined)   
        if(filename in base.files)  
            return base.files[filename];
    return undefined;
};

// Returns an object { "dirs" : [ arrayofdirs ], "files" : [ arrayoffiles ], "error" : "An error message, if happens" }
JPAK.jpakloader.prototype.ls = function(path)   {
    var out = { "files" : [], "dirs" : [] };
    if(this.dataloaded) {
        var base = this.FindDirectoryEntry(path);
        if(base != undefined)  {
            for(var i in base.files)
                out.files.push(base.files[i]);
            for(var i in base.directories)
                out.dirs.push({"name" : base.directories[i].name, "numfiles": base.directories[i].numfiles});
        }else
            out.error = "Directory not found!";
               
    }else
        out.error = "Not loaded";   
    return out;
};

//  Returns a blob of the file. It looks in the cache for already loaded files.
JPAK.jpakloader.prototype.GetFile = function(path, type)  {
    var file = this.FindFileEntry(path);
    type = type || 'application/octet-binary';
    var cache = this.CacheLoad(path);
    
    if(file != undefined && cache == undefined)  { 
        //  Add it to file cache
        var blob = new Blob([new Uint8Array(this.jpakdata.slice(file.offset,file.offset+file.size)).buffer], { "type":type});
        this.filecache.push({"path":path,"type":type,"blob":blob,"url":URL.createObjectURL(blob), "arraybuffer" : this.jpakdata.slice(file.offset,file.offset+file.size)} );
        return blob;
    }else if(cache != undefined)
        return cache.blob;
        
    return undefined;
};

//  Returns a url of the blob file. It looks in the cache for already loaded files.
JPAK.jpakloader.prototype.GetFileURL = function(path, type) {
    var cache = this.CacheLoad(path);
    if(cache == undefined)  {
        var blob = this.GetFile(path, type);
        if(blob != undefined)   
            return URL.createObjectURL(blob);   
        else{
            JPAK.log("Error: Cannot find file \""+path+"\"");   
            return "about:blank"; //    Dunno what to return here
        }
    }else
        return cache.url;
};

//  Returns an arraybuffer with file content. It looks in the cache for already loaded files.
JPAK.jpakloader.prototype.GetFileArrayBuffer = function(path, type) {
    var file = this.FindFileEntry(path);
    type = type || 'application/octet-binary';
    var cache = this.CacheLoad(path);
    
    if(file != undefined && cache == undefined)  { 
        //  Add it to file cache
        var blob = new Blob([new Uint8Array(this.jpakdata.slice(file.offset,file.offset+file.size)).buffer], { "type":type});
        var arraybuffer = this.jpakdata.slice(file.offset,file.offset+file.size);
        this.filecache.push({"path":path,"type":type,"blob":blob,"url":URL.createObjectURL(blob), "arraybuffer" : arraybuffer});
        return arraybuffer;
    }else if(cache != undefined)
        return cache.arraybuffer;
    
    JPAK.log("Error: Cannot find file \""+path+"\"");    
    return undefined;
};
//  Returns an arraybuffer with file content. It looks in the cache for already loaded files.
JPAK.jpakloader.prototype.GetFileArrayBuffer = function(path, type) {
    var file = this.FindFileEntry(path);
    type = type || 'application/octet-binary';
    var cache = this.CacheLoad(path);
    
    if(file != undefined && cache == undefined)  { 
        //  Add it to file cache
        var blob = new Blob([new Uint8Array(this.jpakdata.slice(file.offset,file.offset+file.size)).buffer], { "type":type});
        var arraybuffer = this.jpakdata.slice(file.offset,file.offset+file.size);
        this.filecache.push({"path":path,"type":type,"blob":blob,"url":URL.createObjectURL(blob), "arraybuffer" : arraybuffer});
        return arraybuffer;
    }else if(cache != undefined)
        return cache.arraybuffer;
        
    return undefined;
};

//  Returns an Base64 Encoded File Content. It looks in the cache for already loaded files.
JPAK.jpakloader.prototype.GetBase64File = function(path, type) {
    var filedata = this.GetFileArrayBuffer(path, type);
    if(filedata == undefined)
        return undefined;
    
    return JPAK.ArrayBufferToBase64(filedata);
};

//  Returns an HTML Data URI with File Content. It looks in the cache for already loaded files.
//  Using HTML Data URI for Images, you can hide the load process from chrome Network Inspector
//  I didnt find any place that you can find DataURI File
JPAK.jpakloader.prototype.GetHTMLDataURIFile = function(path, type, encoding) {
    var b64 = this.GetBase64File(path, type);
    // HTML Data URI Format: data:[<MIME-type>][;charset=<encoding>][;base64],<data>
    if(b64 === undefined)
        return undefined
        
    if(encoding !== undefined)
        return "data:"+type+";charset="+encoding+";base64,"+b64;
    else
        return "data:"+type+";base64,"+b64;
};
