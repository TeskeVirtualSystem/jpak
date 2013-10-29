         _ ____   _    _  __        _   ___  
        | |  _ \ / \  | |/ / __   _/ | / _ \ 
     _  | | |_) / _ \ | ' /  \ \ / / || | | |
    | |_| |  __/ ___ \| . \   \ V /| || |_| |
     \___/|_| /_/   \_\_|\_\   \_/ |_(_)___/ 

Description
========

**JPAK** is a multi-use Javascript Package System, developed for loading several files at once with only one package.

For what this can be used?
========

**JPAK** can be used for many things. From game assets to webpage assets. It makes easier to preload all images and resources that you need for website.

What is done
========
*   Javascript Loader
*   Python Packer
*   JPAK 1.0 Specification file
*   Load progress event
*   Get file as Base64
*   Get file as HTML Data URI (for hide from Network Requests)
*   GZIP Decompress Support, forked from https://github.com/jsxgraph/jsxgraph/

TODO
========
*   Load files from JPAK only when needed. A.K.A. - Fetch only the necessary parts from jpak file.
*   Add option to compress files on packing.

How to use it
========

**JPAK** is made to be simple. You can use for any file you want. First, you need to create a JPAK package.

You can use the python script called **packer.py** at `packer` folder. The sintax is simple, just create a folder and thrown what you want on that package inside it.

```shellscript
python packer.py PackageFolder
```

This will generate a file called `PackageFolder.jpak`, with that we can try it at web.

For the webpage, you need to create a JPAK.jpakloader object with a `file` parameter for it, pointing to the package file, and set a onload function.
```javascript
var Package = new JPAK.jpakloader({"file" : "PackageFolder.jpak"});
Package.onload = function()   {
    alert("Package loaded!");
};
```

After that, you need to call the load function, to start loading the file. At the end of processing, it will execute the `onload` function (if it has been defined).

```javascript
Package.Load();
```

By that, you are ready to use it and get the files. I will show two examples of how you can manage files. One image, and one text.

You have two functions to get files.

```javascript
jpakloader.GetFile(path, type)
```
Arguments: 
*   `path`      -> That is the relative path to the package. If the file before packaging was at `PackageFolder/test.jpg` here you would put `/test.jpg`
*   `type`      -> The mimetype of the file. Used in construction of the blob. Defaults to `application/octet-stream`
*   `returns`   -> Returns a blob file with the contents of the file

```javascript
jpakloader.GetFileURL(path, type)
```
*   Same as GetFile, but returns a local `URL` to the blob content.

So basicly, for images you can do something like:

```javascript
var imagetest = Package.GetFileURL("/test.jpg", "image/jpeg"); 
$("body").append('<img src="'+imagetest+'">');
```

and you can do for HTML (text/plain) for example:

```javascript
var testdothtml = Package.GetFile("/test.html", "text/html");
var reader = new FileReader();
reader.onloadend = function(evt)  {
    $("body").append(evt.target.result);
};
reader.readAsText(testdothtml);
```


Class
========

The **JPAK** script has a few features. It caches the already loaded blobs to reduce the memory load, for example.
Here are few functions for now:

```javascript
jpakloader.ls(path)
```

Lists the content of the path

Arguments: 
*   `path`      -> The path you want to list
*   `returns`   -> Returns an object `{ "dirs" : [ arrayofdirs ], "files" : [ arrayoffiles ], "error" : "An error message, if happens" }`

```javascript
jpakloader.GetFile(path, type)
```

Return a blob of the file

Arguments: 
*   `path`      -> The file path to get
*   `type`      -> The mime type. Defaults to  **application/octet-binary**
*   `returns`   -> Returns an blob

```javascript
jpakloader.GetFileURL(path, type)
```

Return a Blob URL to embed as resource.

Arguments: 
*   `path`      -> The file path to get
*   `type`      -> The mime type. Defaults to  **application/octet-binary**
*   `returns`   -> Returns an string containing the Blob Data URL

```javascript
jpakloader.GetFileArrayBuffer(path, type)
```

Return an ArrayBuffer with contents of the file

Arguments: 
*   `path`      -> The file path to get
*   `type`      -> The mime type. Not used directly for this function, but for cache. Defaults to  **application/octet-binary**
*   `returns`   -> Returns an ArrayBuffer with contents of the file



```javascript
jpakloader.GetBase64File(path, type)
```

Return a Base64 Encoded Data from the File

Arguments: 
*   `path`      -> The file path to get
*   `type`      -> The mime type. Not used directly for this function, but for cache. Defaults to  **application/octet-binary**
*   `returns`   -> Returns an string of Base64 Encoded data.

```javascript
jpakloader.GetHTMLDataURIFile(path, type, encoding)
```

Return a HTML Data URI to embed as resource.
This is useful if you want to hide the image load process inside the script, as the browser doesn`t make network requests.

Arguments: 
*   `path`      -> The file path to get
*   `type`      -> The mime type. Defaults to  **application/octet-binary**
*   `encoding`  -> The Encoding of the file. *Optional*
*   `returns`   -> Returns an string of HTML Data URI in format: `data:[<MIME-type>][;charset=<encoding>][;base64],<data>`

Events:
========

*   `onload`    ->  Executed when the **jpackloader** ends loading the JPAK file
*   `onprogress`->  Executed when new progress is available. It has one object argument `{"loaded":loadedbytes,"total":totalbytes,"percent": percentComplete}`
*   `onerror`   ->  Executed when an error has ocurred.  It has one object argument `{"text": errormessage, "errorcode": errorcode}` - The Error Code can be HTML error or `jpakloader` specific error.

JPAK Loader Error Codes:
========

*   100->600    -   HTML Status Code. Consult **RFC-2616** for details.
*   8000        -   Wrong file magic


GZIP Support:
========

The GZIP Decompress support is a modified version of **zip.js** from https://github.com/jsxgraph/jsxgraph/ project. For now, the default behaviour of `jpakloader` is to check the `compressed` flag at file entry. If its true, it tryes to decompress the file. 
For **zip.js** license, consult the file or the JSXGraph Github

For compatible GZIPPing a file on Python you can do:
```python
import zlib
f = open("uncompressed", "rb")
data = f.read()
f.close()
data = zlib.compress(data, 9)   # Level 9 is important
f = open("compressed", "wb")
f.write(data)
f.close()
```

*   TODO on Tools: Add option to compress files on packer.py

Example
========

You can check the folder `test` for see a working simple example that loads an `image`, `javascript` and a `HTML` file to the page.

