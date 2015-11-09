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

import json, struct, os

class JPKVolumeEntry:
  '''
    {
      "filename": "vol0.jds"
    }
  '''
  filename = ""
  start = 0
  end = 0

  def __init__(self, filename=""):
    self.filename = filename

  def toObject(self):
    return {"filename":self.filename}

  def fromObject(self, obj):
    self.filename = obj["filename"] if "filename" in obj else ""

class JPKFileEntry:
  '''
  fileentry   =   {   
      "name"          :   FILENAME,               //  File Name
      "path"          :   FILEPATH,               //  File Path
      "offset"        :   FILEOFFSET,             //  Absolute offset in the jpak file
      "size"          :   FILESIZE                //  The file size
      "aeskey"        :   AESKEY                  //  File key if != false
      "zlib"          :   FALSE/TRUE              //  If file is compressed
      "volume"        :   VOLUMEID                //  ID from VolumeTable
      "md5"           :   MD5SUM                  //  Uncompresssed/unencrypted file MD5SUM
  }
  '''
  name = ""
  path = ""
  offset = 0
  size = 0
  aeskey = ""
  zlib = False
  volume = ""
  md5 = ""

  def __init__(self, name="", path="", offset=0, size=0, aeskey="", zlib=False, volume="", md5=""):
    self.name = name
    self.path = path
    self.offset = offset
    self.size = size
    self.aeskey = aeskey
    self.zlib = zlib
    self.volume = volume
    self.md5 = md5

  def toObject(self):
    return {"name":self.name, "path":self.path, "offset":self.offset, "size":self.size, "aeskey":self.aeskey, "zlib":self.zlib, "volume":self.volume, "md5": self.md5}

  def fromObject(self, obj):
    self.name     = obj["name"]   if "name"   in obj else ""
    self.path     = obj["path"]   if "path"   in obj else ""
    self.offset   = obj["offset"] if "offset" in obj else ""
    self.size     = obj["size"]   if "size"   in obj else ""
    self.aeskey   = obj["aeskey"] if "aeskey" in obj else ""
    self.zlib     = obj["zlib"]   if "zlib"   in obj else ""
    self.volume   = obj["volume"] if "volume" in obj else ""
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

  def fromJson(self, json_):
    obj = json.loads(json_)
    self.fromObject(obj)

  def fromDirectory(self, folder, jds):
    if os.path.isdir(folder):
      print "Folder: %s" % folder
      dt = os.listdir(folder)
      for i in dt:
        print "File: %s" %i
        if os.path.isfile(folder+"/"+i):
          offset, size = jds.addFromFile(folder+"/"+i)
          newfile = JPKFileEntry(name=os.path.basename(i), path=folder+"/"+i, offset=offset, size=size, volume=jds.name)
          self.files = {}
          self.files[os.path.basename(i)] = newfile
          self.numfiles += 1
          print self.name
        else:
          newdir = JPKDirectoryEntry(directories={},files={})
          newdir.fromDirectory(folder+"/"+i, jds)
          self.directories[os.path.basename(i)] = newdir

    else:
      print "File: %s" % folder
      offset, size = jds.addFromFile(folder)
      newfile = JPKFileEntry(name=os.path.basename(folder), path=folder, offset=offset, size=size)
      self.files[os.path.basename(folder)] = newfile
      self.numfiles += 1

class JMS:
  MAGIC = "JMS1"
  volumeTable = {}
  fileTable = JPKDirectoryEntry()
  producerId = 0
  flags = 0
  userflags = 0

  def __init__(self, volumeTable={}, fileTable=JPKDirectoryEntry(), producerId=0, flags=0, userflags=0):
    self.volumeTable = volumeTable
    self.fileTable = fileTable
    self.producerId = producerId
    self.flags = flags
    self.userflags = userflags
    self.fileTable.name = "ROOT"

  def fromDirectory(self, directory, jds):
    self.fileTable.fromDirectory(directory, jds)

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

    self.volumeTable = {}

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

    fileTableOffset = struct.unpack("<I", data[len(data)-4:len(data)])[0]
    volumeTableSize = fileTableOffset - 0xC
    fileTableSize = len(data) - fileTableOffset - 12

    fileTableData = json.loads(data[fileTableOffset:fileTableOffset+fileTableSize-4])
    volumeTableData = json.loads(data[0xC:volumeTableSize+0xC])

    self.fileTable = JPKDirectoryEntry()
    self.fileTable.fromObject(fileTableData)

    self.volumeTable = {}
    for key, value in volumeTableData.iteritems():
      v = JPKVolumeEntry()
      v.fromObject(value)
      self.volumeTable[key] = v

  def toBinary(self):
    data = self.MAGIC
    data += "\x00" * 8
    vt = {}
    
    for key, value in self.volumeTable.iteritems():
      vt[key] = value.toObject()
    data += json.dumps(vt)

    fileTableOffset = len(data)
    data += self.fileTable.toJson()
    data += struct.pack("<4I", self.producerId, self.flags, self.userflags, fileTableOffset)
    return data

  def addVolume(self, jds):
    if jds.name in self.volumeTable:
      print "Volume already exists! %s" % jds.name
      return

    print self.volumeTable
    volume = JPKVolumeEntry(jds.filename)
    self.volumeTable[jds.name] = volume

  def toFile(self, filename):
    data = self.toBinary()
    f = open(filename, "wb")
    f.write(data)
    f.close()

class JDS:
  MAGIC = "JDS1"
  name = ""
  filename = ""
  fd = None
  CHUNK = 4096

  def __init__(self, name, filename):
    self.filename = filename
    self.name = name
    if os.path.isfile(filename):
      self.fd = open(filename, "rb+")
    else:
      self.fd = open(filename, "wb+")

    self.fd.seek(0,2)
    if self.fd.tell() == 0:
      self.__buildHeader()
    self.fd.seek(0)

  def __buildHeader(self):
    print "Creating Header"
    self.fd.write(self.MAGIC)
    self.fd.write("\x00"*8)

  def add(self, data):
    offset = fd.tell()
    size = len(data)
    self.fd.write(data)
    return offset, size

  def addFromFile(self, filename):
    f = open(filename,"rb")
    offset = self.fd.tell()
    f.seek(0,2)
    size = f.tell()
    f.seek(0)
    c = 0
    while c < size:
      chunk = self.CHUNK if size - c > self.CHUNK else size - c
      data = f.read(chunk)
      self.fd.write(data)
      c += chunk
    return offset, size

    def close(self):
      self.fd.close()

