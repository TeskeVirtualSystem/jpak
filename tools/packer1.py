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


if len(sys.argv) > 1:
    user_args = sys.argv[1:]
    for packdir in user_args:
        packdir = os.path.normpath(packdir)
        packfile = packdir + ".jpak"
        print("Generating file %s with folder %s" % (packfile, packdir))

        jsondata = {"name": packdir, "size": 0, "numfiles": 0, "path": "/", "files": {}, "directories": {}}
        lastentry = jsondata

        volume = open(packfile, "wb")

        AddDataToVolume(b"JPAK1", volume)      #   JPAK1 Identifier
        AddDataToVolume(b"\x00" * 8, volume)   #   Padding

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
                lastentry["directories"][d] = {"name": d, "path": "/%s" % os.path.join(relroot, d), "directories": {}, "files": {}, "numfiles": 0}
            for f in files:
                lastentry["files"][f] = {"name": f, "path": "/%s" % os.path.join(relroot, f), "compressed": False}
                lastentry["numfiles"] += 1
                offset, size, md5 = AddToVolume(os.path.join(root, f), volume)
                lastentry["files"][f]["offset"] = offset
                lastentry["files"][f]["size"] = size

        jsondata_bytes = json.dumps(jsondata).encode('utf-8')

        offset, size = AddDataToVolume(jsondata_bytes, volume)
        volume.write(struct.pack("I", offset))
        volume.close()
else:
    print('''This python script will take a folder as argument, and generates a jpak file with same name.
Usage: python packer1.py folder1 folder2 folder3 ...
Ex: python packer1.py pack0
This will generate a pack0.jpak with contents of folder pack0''')
