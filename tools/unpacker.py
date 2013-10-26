#!/usr/bin/env python

print '''
     _ ____   _    _  __  _   _                        _             
    | |  _ \ / \  | |/ / | | | |_ __  _ __   __ _  ___| | _____ _ __ 
 _  | | |_) / _ \ | ' /  | | | | '_ \| '_ \ / _` |/ __| |/ / _ \ '__|
| |_| |  __/ ___ \| . \  | |_| | | | | |_) | (_| | (__|   <  __/ |   
 \___/|_| /_/   \_\_|\_\  \___/|_| |_| .__/ \__,_|\___|_|\_\___|_|   
                                     |_|                                                                     
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak
'''

import struct, os, json, sys
from jpaktool import *

if len(sys.argv) > 1:
    user_args = sys.argv[1:]
    for packfile in user_args:
        mkdir(os.path.splitext(os.path.basename(packfile))[0] + "/")
        volume = open(packfile, "rb")
        filetable = GetFileTable(volume)
        ProcessFolder(filetable, volume, root)
        volume.close()
else:
    print '''This python script will take a jpak as argument, and generates a folder  with same name of the file, with contents extracted. 
Usage: python unpacker.py file1 file2 file3 ...
Ex: python unpacker.py test.jpak
This will generate a folder test with contents of folder test.jpak'''
