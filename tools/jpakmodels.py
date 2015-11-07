#!/usr/bin/env python

'''
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak

'''

import json, struct

class JPKVolumeEntry:
  '''
    {
      "filename": "vol0.jds",
      "start": 0,
      "end": 1000
    }
  '''
  filename = ""
  start = 0
  end = 0

  def __init__(self, filename="", start=0, end=0):
    self.filename = filename
    self.start = start
    self.end = end

  def toObject(self):
    return {"filename":self.filename,"start":self.start,"end":self.end}

  def fromObject(self, obj):
    self.filename = obj["filename"] if "filename" in obj else ""
    self.start = obj["start"] if "start" in obj else 0
    self.end = obj["end"] if "end" in obj else 0

class JPKFileEntry:
  '''
  fileentry   =   {   
      "name"          :   FILENAME,               //  File Name
      "path"          :   FILEPATH,               //  File Path
      "offset"        :   FILEOFFSET,             //  Absolute offset in the jpak file
      "size"          :   FILESIZE                //  The file size
      "aeskey"        :   AESKEY                  //  File key if != false
      "zlib"          :   FALSE/TRUE              //  If file is compressed
      "md5"           :   MD5SUM                  //  Uncompresssed/unencrypted file MD5SUM
  }
  '''
  name = ""
  path = ""
  offset = 0
  size = 0
  aeskey = ""
  zlib = False
  md5 = ""

  def __init__(self, name="", path="", offset=0, size=0, aeskey="", zlib=False, md5=""):
    self.name = name
    self.path = path
    self.offset = offset
    self.size = size
    self.aeskey = aeskey
    self.zlib = zlib
    self.md5 = md5

  def toObject(self):
    return {"name":self.name, "path":self.path, "offset":self.offset, "size":self.size, "aeskey":self.aeskey, "zlib":self.zlib, "md5": self.md5}

  def fromObject(self, obj):
    self.name     = obj["name"]   if "name"   in obj else ""
    self.path     = obj["path"]   if "path"   in obj else ""
    self.offset   = obj["offset"] if "offset" in obj else ""
    self.size     = obj["size"]   if "size"   in obj else ""
    self.aeskey   = obj["aeskey"] if "aeskey" in obj else ""
    self.zlib     = obj["zlib"]   if "zlib"   in obj else ""
    self.md5      = obj["md5"]    if "md5"    in obj else ""

class JPKDirectoryEntry:
  '''
  direntry    =   { 
      "name"          :   DIRNAME,                //  Ndame of this folder
      "path"          :   DIRPATH,                //  Path for this folder
      "numfiles"      :   DIRNUMFILES,            //  Number of files in root of this folder
      "directories"   :   DIRSUBDIRECTORIES,      //  It's an array [] with directory objects like direntry
      "files"         :   DIRFILES                //  It's an array [] with file objects like fileentry
      "aeskey"        :   AESKEY                  //  Folder key if != false
  }
  '''
  name = ""
  path = ""
  numfiles = 0
  directories = {}
  files = {}
  aeskey = ""

  def __init__(self, name="", path="", numfiles=0, directories={}, files={}, aeskey=""):
    self.name = name
    self.path = path
    self.numfiles = numfiles
    self.directories = directories
    self.files = files
    self.aeskey = aeskey

  def toObject(self):
    dirs = {}
    fls = {}
    for key, value in self.directories.iteritems():
      dirs[key] = value.toObject()

    for key, value in self.files.iteritems():
      fls[key] = value.toObject()

    return {"name":self.name, "path":self.path, "numfiles":len(self.files), "directories":dirs, "files":fls, "aeskey":self.aeskey}

  def fromObject(self, obj):
    self.name       = obj["name"]     if "name"     in obj else ""
    self.path       = obj["path"]     if "path"     in obj else ""
    self.numfiles   = obj["numfiles"] if "numfiles" in obj else ""
    self.aeskey     = obj["aeskey"]   if "aeskey"   in obj else ""

    if "directories" in obj:
      for key, value in obj["directories"].iteritems():
        d = JPKDirectoryEntry()
        d.fromObject(value)
        self.directories[key] = d

    if "files" in obj:
      for key, value in obj["files"].iteritems():
        f = JPKFileEntry()
        f.fromObject(value)
        self.files[key] = f

  def toJson(self):
    return json.dumps(self.toObject())

  def fromJson(self, json):
    obj = json.loads(json)
    self.fromObject(obj)

def JMS:
  MAGIC = "JMS1"
  volumeTable = []
  fileTable = JPKDirectoryEntry()
  producerId = 0
  flags = 0
  userflags = 0

  def __init__(self, volumeTable=[], fileTable={}, producerId=0, flags=0, userflags=0):
    self.volumeTable = volumeTable
    self.fileTable = fileTable
    self.producerId = producerId
    self.flags = flags
    self.userflags = userflags

  def toObject(self):
    vt = []
    ft = {}
    for value in self.volumeTable:
      vt.append(value.toObject())

    for key, value in self.fileTable:
      ft[key] = value.toObject()

    return {"MAGIC":self.MAGIC, "volumeTable":vt, "fileTable":ft, "producerId": self.producerId, "flags":self.flags,"userflags":self.userflags}

  def fromObject(self, obj):
    self.MAGIC = obj["MAGIC"] if "MAGIC" in obj else self.MAGIC
    self.producerId = obj["producerId"] if "producerId" in obj else 0
    self.flags = obj["flags"] if "flags" in obj else 0
    self.userflags = obj["userflags"] if "userflags" in obj else 0

    self.fileTable = JPKDirectoryEntry()
    if "fileTable" in obj:
      self.fileTable.fromObject(obj["fileTable"])

    self.volumeTable = []

    if "volumeTable" in obj:
      for value in obj["volumeTable"]:
        v = JPKVolumeEntry()
        v.fromObject(value)
        self.volumeTable.append(v)

  def fromBinary(self, data):
    self.MAGIC = data[:4]
    if not self.MAGIC == "JMS1":
      print "Invalid Magic for JMS file: %s" %self.MAGIC
      self.MAGIC = "JMS1"
      return

    fileTableOffset = struct.unpack("<I", data[len(data)-4:len(data)])
    volumeTableSize = fileTableOffset - 0xC
    fileTableSize = len(data) - fileTableOffset - 12

    fileTableData = json.loads(data[fileTableOffset:fileTableOffset+fileTableSize])
    volumeTableData = json.loads(data[0xC:volumeTableSize+0xC])

    self.fileTable = JPKDirectoryEntry()
    self.fileTable.fromJson(fileTableData)

    self.volumeTable = []
    for value in volumeTableData:
      v = JPKVolumeEntry()
      v.fromObject(value)
      self.volumeTable.append(v)
