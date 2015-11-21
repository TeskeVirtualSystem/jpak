/*jslint node: true */
"use strict";


module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    uglify: {
      dist: {
        files: {
          "dist/jpak.min.js": [ "dist/jpak.js" ]
        },
        options: {
          mangle: false
        }
      }
    },

    clean: {
      temp: {
        src: [ "tmp" ]
      },
      dist: {
        src: [ "dist/*.js" ]
      }
    },

    concat: {
      dist: {
        src: ["3rdparty/q/q.js", "jssrc/*.js" ],
        dest: "dist/jpak.js"
      }
    },

    jshint: {
      all: [ "Gruntfile.js", "jssrc/*.js" ]
    },

    connect: {
      server: {
        options: {
          hostname: "localhost",
          port: 8082
        }
      }
    },

    watch: {
      dev: {
        files: [ "Gruntfile.js", "jssrc/*.js" ],
        tasks: [ "jshint", "concat:dist", "clean:temp" ],
        options: {
          atBegin: true
        }
      },
      min: {
        files: [ "Gruntfile.js", "jssrc/*.js" ],
        tasks: [ "jshint", "concat:dist", "clean:temp", "uglify:dist" ],
        options: {
          atBegin: true
        }
      }
    },

    compress: {
      dist: {
        options: {
          archive: "dist/<%= pkg.name %>-<%= pkg.version %>.zip"
        },
        files: [{
          src: [ "dist/*.js", "dist/*.css" ]
        }]
      }
    },
  });

  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("dev", [ "clean:dist", "connect:server", "watch:dev" ]);
  grunt.registerTask("test", [ "clean:dist", "jshint" ]);
  grunt.registerTask("junit", [ "clean:dist", "jshint" ]  );
  grunt.registerTask("minified", [ "clean:dist", "connect:server", "watch:min" ]);
  grunt.registerTask("package", [ "clean:dist", "jshint", "concat:dist",
    "uglify:dist", "less:dist", "clean:temp", "compress:dist" ]);
};
