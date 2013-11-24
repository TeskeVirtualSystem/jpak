Array.prototype.clean = function() {};

var JPAK = {
    "ShowMessages": {},
    "Uint8ArrayToString": function () {},
    "String2ArrayBuffer": function () {},
    "Base64_Encoding": {},
    "ArrayBufferToBase64": function () {},
    "log": function () {},
    "jpakloader": function () {}
}

var u8as;

JPAK.Uint8ArrayToString = function(arg) {};
JPAK.String2ArrayBuffer = function(str) {}; 
JPAK.ArrayBufferToBase64 = function(arrayBuffer) {};
JPAK.log = function(msg) {};
JPAK.jpakloader = function(parameters)  {};
JPAK.jpakloader.prototype.CacheLoad     =   function(path)  {};
JPAK.jpakloader.prototype.Load = function() {};
JPAK.jpakloader.prototype.FindDirectoryEntry = function(path)  {};
JPAK.jpakloader.prototype.FindFileEntry = function(path)    {};
JPAK.jpakloader.prototype.ls = function(path)   {};
JPAK.jpakloader.prototype.GetFile = function(path, type)  {};
JPAK.jpakloader.prototype.GetFileURL = function(path, type) {};
JPAK.jpakloader.prototype.GetFileArrayBuffer = function(path, type) {};
JPAK.jpakloader.prototype.GetBase64File = function(path, type) {};
JPAK.jpakloader.prototype.GetHTMLDataURIFile = function(path, type, encoding) {};
