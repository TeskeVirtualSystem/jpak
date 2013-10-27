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

        
if len(sys.argv) > 1:
    user_args = sys.argv[1:]
    for packdir in user_args:
        packdir = os.path.normpath(packdir)
        packfile = packdir+".jpak"
        print "Generating file %s with folder %s" %(packfile,packdir)

        jsondata = { "name" : packdir, "size" : 0, "numfiles" : 0, "path" : "/", "files" : {}, "directories" : {} }
        lastentry = jsondata

        volume = open(packfile, "wb")

        AddDataToVolume("JPAK1", volume)    #   JPAK1 Identifier
        AddDataToVolume("\x00"*8, volume)   #   Padding   

        for root, dirs, files in os.walk(packdir):
            rootdata = root.split("/")[1:]
            relroot = "/".join(rootdata)
            lastentry = jsondata
            for entry in rootdata:
                lastentry = lastentry["directories"][entry]
                
            for dir in dirs:
                lastentry["directories"][dir] = { "name" : dir, "path" : "/%s" % os.path.join(relroot,dir), "directories" : {}, "files" : {}, "numfiles" : 0 }
            for file in files:
                # TODO: Compress files if needed/want
                lastentry["files"][file] = { "name" : file, "path" : "/%s" % os.path.join(relroot,file), "compressed" : False }
                lastentry["numfiles"] += 1
                offset, size = AddToVolume(os.path.join(root,file), volume)
                lastentry["files"][file]["offset"] = offset
                lastentry["files"][file]["size"] = size
                
        jsondata = json.dumps(jsondata)

        offset, size = AddDataToVolume(jsondata, volume)
        volume.write(struct.pack("I", offset))
        volume.close()
else:
    print '''This python script will take a folder as argument, and generates a jpak file with same name. 
Usage: python packer.py folder1 folder2 folder3 ...
Ex: python packer.py pack0
This will generate a pack0.jpak with contents of folder pack0'''
