#!/usr/bin/env python

print '''
     _ ____   _    _  __  ____            _             
    | |  _ \ / \  | |/ / |  _ \ __ _  ___| | _____ _ __ 
 _  | | |_) / _ \ | ' /  | |_) / _` |/ __| |/ / _ \ '__|
| |_| |  __/ ___ \| . \  |  __/ (_| | (__|   <  __/ |   
 \___/|_| /_/   \_\_|\_\ |_|   \__,_|\___|_|\_\___|_|   
                                                        
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak
'''

import struct, os, json, sys
from jpaktool import *

if len(sys.argv) > 5:
    prodid = int(sys.argv[1])
    userflags = int(sys.argv[2])
    encrypt = sys.argv[3] == "1"
    compress = True
    password = sys.argv[4]
    user_args = sys.argv[5:]
    for packdir in user_args:
        packdir = os.path.normpath(packdir)
        packfile = packdir+".jpak"
        print "Generating file %s with folder %s" %(packfile,packdir)

        jsondata = { "name" : packdir, "size" : 0, "numfiles" : 0, "path" : "/", "files" : {}, "directories" : {}, "key": B64E(GenKey()) if encrypt else False }
        lastentry = jsondata

        volume = open(packfile, "wb")

        AddDataToVolume("JPAK2", volume)    #   JPAK2 Identifier
        AddDataToVolume("\x00"*7, volume)   #   Padding   

        for root, dirs, files in os.walk(packdir):
            rootdata = root.split("/")[1:]
            relroot = "/".join(rootdata)
            lastentry = jsondata
            for entry in rootdata:
                lastentry = lastentry["directories"][entry]
                
            for dir in dirs:
                lastentry["directories"][dir] = { "name" : dir, "path" : "/%s" % os.path.join(relroot,dir), "directories" : {}, "files" : {}, "numfiles" : 0, "key" : B64E(GenKey(B64D(lastentry["key"]))) if encrypt else False }
            for file in files:
                # TODO: Compress files if needed/want
                lastentry["files"][file] = { "name" : file, "path" : "/%s" % os.path.join(relroot,file), "compressed" : False, "key": B64E(GenKey(B64D(lastentry["key"]))) if encrypt else False }
                lastentry["numfiles"] += 1
                offset, size, md5 = AddToVolume(os.path.join(root,file), volume, MergeKeys(B64D(lastentry["files"][file]["key"]), B64D(lastentry["key"])) if encrypt else False , compress)
                lastentry["files"][file]["offset"] = offset
                lastentry["files"][file]["size"] = size
                lastentry["files"][file]["md5"] = md5
                
        jsondata = json.dumps(jsondata)

        offset, size = AddDataToVolume(jsondata, volume, password if encrypt else None, compress)
        volume.write(struct.pack("<IIII", prodid, userflags, GenJPAKFlags(encrypt,compress,False,encrypt), offset))
        volume.close()
else:
    print '''This python script will take a folder as argument, and generates a jpak file with same name. 
Usage: python packer.py ProducerID UserFlags encrypt password folder1 folder2 folder3 ...
Ex: python packer.py pack0
This will generate a pack0.jpak with contents of folder pack0'''
