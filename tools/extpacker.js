#!/usr/bin/nodejs 

var fs = require("fs");
var jpaktool = require("../dist/jpak").JPAK;
var fs = require("fs");
var path = require("path");

if (process.argv.length < 3) {
  console.log("Usage: nodejs extpacker.js metadata.jms volumeX.jds folder ...");
  console.log("Example: nodejs extpacker.js myproject.jms volume0.jds /home/lucas/");
} else {
  var metadataF = process.argv[2];
  var volume = process.argv[3];
  process.argv.splice(0,4);
  var user_args = process.argv;
  console.log("Metadata File: "+metadataF+" - Volume: "+volume+" Args: ",user_args);

  var metadata = new jpaktool.Classes.JMS();

  if (fs.existsSync(metadataF) && fs.statSync(metadataF).isFile()) {
    var data = fs.readFileSync(metadataF, {flag: "r"});
    metadata.fromBinary(data);
  }

  var jdata = new jpaktool.Classes.JDS(path.basename(volume), volume);
  metadata.addVolume(jdata);
  metadata.fromArgs(user_args, jdata);
  metadata.toFile(metadataF);
  jdata.close();
}