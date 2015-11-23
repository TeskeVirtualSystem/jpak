         _ ____   _    _  __        ____    ___  
        | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
     _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
    | |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
     \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                 
Description
===========

**JPAK** is a multi-use Javascript Package System, developed for loading several files at once with only one package.

For what this can be used?
==========================

**JPAK** can be used for many things. From game assets to webpage assets. It makes easier to preload all images and resources that you need for website.

What is done
========
* Javascript Loader / Packer for 2.0 EXT (Both NodeJS and Browser)
* Python Packer for 1.0
* JPAK 1.0 Specification file
* JPAK 2.0 Extended Specification file
* Load progress event
* Get file as Base64
* Get file as HTML Data URI (for hide from Network Requests)
* GZIP Decompress Support, forked from https://github.com/jsxgraph/jsxgraph/
* Simple C# Windows Tool for Exploring and Export Content from JPAK Files (v1.0)
* C++ Extension
* Partial Loading of data

TODO
========
* Add option to compress files on packing.
* More stuff on JPAK Explorer for Windows
* JPAK Explorer for Linux
* Documents for C#, C++
* Zlib Decompress for C++
* C++ Library for JPAK 2.0 EXT

Generating JPAK1 Packages
=============

**JPAK** is made to be simple. You can use for any file you want. First, you need to create a JPAK package.
You can use the python script called **packer.py** at `tools` folder. The sintax is simple, just create a folder and thrown what you want on that package inside it.

```shellscript
python packer1.py PackageFolder
```
This will generate a file called `PackageFolder.jpak`, with that we can try it at web.

Generating JPAK 2 Ext (JMS) Packages
====================================

For creating a **JMS** package you should use the `extpacker.js` inside the tools folder like below:
```shellscript
./extpacker.js package.jms volume.jds folder/*
```

This should generate a metadata file called `package.jms`, a data storage volume called `volume.jds` using contents of `folder`. Everytime you load this package, you will load the `package.jms` file, that will point out where are the volumes and which files are inside. 

You can append data to a JMS by running the same command again with another volume:
```shellscript
./extpacker.js package.jms volume2.jds folder2/*
```

Using the Webloader
===================

When implementing the new Web Loader (for both JPAK1 and JMS) we decided to change the way it works to be more usefull and work for both files. This broke the compatibility with the older JPAK Loader, so if you are upgrading it, you will need to change how it works.

First you need to initialize a loader by doing:

```javascript
var myJpakLoader = new JPAK.Loader({"file" : "packtest.jms"}); // you can do the same thing for a jpak file just by replacing the file name.
```

Then you can make the loader start loading metadata and filling the object and use a promise to get the callback when its done.
```javascript
myJpakLoader.load().then(function() {
// Called when its loaded
});
```

So after it is loaded, you can load files in the old loader fashion:
```javascript
myJpakLoader.load().then(function() {
// Called when its loaded
    myJpakLoader.getFileURL("/img/python-logo-official.png", "image/png").then(function(data) {
      $("body").append('<BR>/img/python-logo-official.png: <BR><BR> <img src="'+data+'">');
      console.log("Loaded /img/python-logo-official.png");
    });
});
```

API
===

You have about the same calls as the older loader, but in a promise way.
```javascript
myJpakLoader.getFile(path, type).then(function (data) {
    // data is a BLOB
});
```
Arguments: 
*   `path`      -> That is the relative path to the package. If the file before packaging was at `PackageFolder/test.jpg` here you would put `/test.jpg`
*   `type`      -> The mimetype of the file. Used in construction of the blob. Defaults to `application/octet-stream`

```javascript
myJpakLoader.getFileURL(path, type).then(function(url) {
    //  url is a URL to local blob content
});
```

So basicly, for images you can do something like:

```javascript
myJpakLoader.getFileURL("/test.jpg", "image/jpeg").then(function(url) {
    $("body").append('<img src="'+url+'">');
});
```

and you can do for HTML (text/plain) for example:

```javascript
myJpakLoader.getFile("/test.html", "text/html").then(function(data) {
  var reader = new FileReader();
  reader.onloadend = function(evt)  {
      $("body").append('<BR>/test.html:<BR><BR>'+evt.target.result);   
  };
  reader.readAsText(data);
});
```

Compiling the Library / Running Examples
=====================
There is a already minified version at `dist/jpak.min.js` but if you want to compile by yourself or run the examples locally, you can do:

```shellscript
npm install
npm install -g bower
npm install -g grunt-cli
bower install
sudo grunt dev
```

This should setup a local enviroment for testing the JPAK Library. Then you can open in your browser `http://localhost:8082/test/` to see the examples.

If you just want to build it, do the same as before, but instead `sudo grunt dev` do:
```shellscript
grunt concat uglify
```

This will generate the minified version `jpak.min.js` and the non-minified version `jpak.js`.

C# JPAK Tool:
========

A C# Version of JPAK Tool is available. There is many things todo in there, but it works for the JPAK Explorer. The images used in thumbnail is from Crystal Clear, can be found at http://commons.wikimedia.org/wiki/Crystal_Clear and its licensed under LGPL

Example
========

You can check the folder `test` for see a working simple example that loads an `image`, `javascript` and a `HTML` file to the page.

