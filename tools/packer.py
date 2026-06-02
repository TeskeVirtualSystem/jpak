#!/usr/bin/env python3

print(r'''
     _ ____   _    _  __  ____            _
    | |  _ \ / \  | |/ / |  _ \ __ _  ___| | _____ _ __
 _  | | |_) / _ \ | ' /  | |_) / _` |/ __| |/ / _ \ '__|
| |_| |  __/ ___ \| . \  |  __/ (_| | (__|   <  __/ |
 \___/|_| /_/   \_\_|\_\ |_|   \__,_|\___|_|\_\___|_|

Multiuse Javascript Package
By: Lucas Teske
https://github.com/TeskeVirtualSystem/jpak
''')

import struct
import os
import json
import sys
from jpaktool import *

if len(sys.argv) > 5:
    prodid = int(sys.argv[1])
    userflags = int(sys.argv[2])
    encrypt = sys.argv[3] == "1"
    compress = False
    password = sys.argv[4]
    user_args = sys.argv[5:]
    for packdir in user_args:
        packdir = os.path.normpath(packdir)
        packfile = packdir + ".jpak"
        print("Generating file %s with folder %s" % (packfile, packdir))

        jsondata = {"name": packdir, "size": 0, "numfiles": 0, "path": "/", "files": {}, "directories": {}, "key": B64E(GenKey()) if encrypt else False}
        lastentry = jsondata

        volume = open(packfile, "wb")

        AddDataToVolume(b"JPAK2", volume)      #   JPAK2 Identifier
        AddDataToVolume(b"\x00" * 7, volume)   #   Padding

        for root, dirs, files in os.walk(packdir):
            relpath = os.path.relpath(root, packdir)
            if relpath == ".":
                rootdata = []
            else:
                rootdata = relpath.split(os.sep)
            relroot = relpath if relpath != "." else ""
            lastentry = jsondata
            for entry in rootdata:
                lastentry = lastentry["directories"][entry]

            for d in dirs:
                lastentry["directories"][d] = {"name": d, "path": "/%s" % os.path.join(relroot, d), "directories": {}, "files": {}, "numfiles": 0, "key": B64E(GenKey(B64D(lastentry["key"]))) if encrypt else False}
            for f in files:
                lastentry["files"][f] = {"name": f, "path": "/%s" % os.path.join(relroot, f), "compressed": False, "key": B64E(GenKey(B64D(lastentry["key"]))) if encrypt else False}
                lastentry["numfiles"] += 1
                offset, size, md5 = AddToVolume(os.path.join(root, f), volume, MergeKeys(B64D(lastentry["files"][f]["key"]), B64D(lastentry["key"])) if encrypt else False, compress)
                lastentry["files"][f]["offset"] = offset
                lastentry["files"][f]["size"] = size
                lastentry["files"][f]["md5"] = md5

        jsondata_bytes = json.dumps(jsondata).encode('utf-8')

        offset, size = AddDataToVolume(jsondata_bytes, volume, password.encode('utf-8') if encrypt else None, compress)
        volume.write(struct.pack("<IIII", prodid, userflags, GenJPAKFlags(encrypt, compress, False, encrypt), offset))
        volume.close()
else:
    print('''This python script will take a folder as argument, and generates a jpak file with same name.
Usage: python packer.py ProducerID UserFlags encrypt password folder1 folder2 folder3 ...
Ex: python packer.py pack0
This will generate a pack0.jpak with contents of folder pack0''')
