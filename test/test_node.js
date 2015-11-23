#!/usr/bin/env nodejs

var JPAK = require("../dist/jpak").JPAK;

console.log("Loading packtest.jms");

var packtest = new JPAK.Loader({"file" : "packtest.jms"});
packtest.load().then(function() {
  // Lets load the HTML file
  console.log("Loaded");
  packtest.getFile("/test.html", "text/html").then(function(data) {
    data = (new Uint8Array(data)).asString();
    console.log(data);
  }).catch(function(err) {
    console.error(err);
    console.error(err.stack);
  });
}).catch(function(err) {
  console.error(err);
  console.error(err.stack);
});