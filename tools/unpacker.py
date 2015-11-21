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
https://github.com/TeskeVirtualSystem/jpak
'''

import struct, os, json, sys
from jpaktool import *

if len(sys.argv) > 1:
    user_args = sys.argv[1:]
    for packfile in user_args:
        mkdir(os.path.splitext(os.path.basename(packfile))[0] + "/")
        volume = open(packfile, "rb")
        magic = volume.read(5)
        volume.seek(0)
        if "JPAK1" in magic:
            version = 1
        elif "JPAK2" in magic:
            version = 2
        else:
            print 'Unknown version: %s' %magic
            exit(1)
        if version == 1:
            filetable = GetFileTable(volume, version)
            print filetable
            ProcessFolder(filetable, volume, "", version)
        elif version == 2:
            ProdID, UserFlags, JPAKFlags = GetFlags(volume)
            print "Producer ID: %s - UserFlags: %x" %(ProdID, UserFlags)
            JPAKFlags = ParseJPAKFlags(JPAKFlags)
            if JPAKFlags["ZLIB"]:
                print "Is compressed"
            if JPAKFlags["AES"]:
                print "Is encrypted"
            key = None
            if JPAKFlags["AES"]:
                key = raw_input("Encrypted file, please enter the password: ")
                if key == None or len(key) == 0:
                    print "No Password supplied"
                    exit(1)
            filetable = GetFileTable(volume, version, key, JPAKFlags["ZLIB"])
            ProcessFolder(filetable, volume, "", version, JPAKFlags["ZLIB"])

        volume.close()
else:
    print '''This python script will take a jpak as argument, and generates a folder  with same name of the file, with contents extracted. 
Usage: python unpacker.py file1 file2 file3 ...
Ex: python unpacker.py test.jpak
This will generate a folder test with contents of folder test.jpak'''
