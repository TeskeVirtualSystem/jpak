#!/usr/bin/env python

'''
     _ ____   _    _  __        _   ___  
    | |  _ \ / \  | |/ / __   _/ | / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / || | | |
| |_| |  __/ ___ \| . \   \ V /| || |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_(_)___/ 
                                         
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak

'''
import struct, os, json, sys

def GetFileTable(volume):
    '''
        Gets the file table.
        Returns: the JSON file table
    '''
    volume.seek(-4, 2)
    filetableoffset = struct.unpack("I",volume.read(4))[0]
    volume.seek(0,2)
    size = volume.tell()
    volume.seek(filetableoffset)
    filetable = volume.read(size-filetableoffset-4)
    return json.loads(filetable)   

def AddToVolume(filepath, volume):
    '''
        Add File to volume
        Return: (offset, size)
    '''
    f = open(filepath, "rb")
    data = f.read()
    f.close()
    offset = volume.tell()
    volume.write(data)
    return offset, volume.tell()-offset

def AddDataToVolume(data, volume):
    '''
        Add Data to Volume
        Return: (offset, size)
    '''
    offset = volume.tell()
    volume.write(data)
    return offset, volume.tell()-offset
    
    
def mkdir(path):
    '''
        Creates a dir.
    '''
    print "Creating dir %s" %path
    try:
        os.mkdir(path)
    except:
        pass

def ProcessFolder(entry,volume,root):
    '''
        Process a Folder entry
    '''
    root = root + entry["name"] +"/"
    ProcessFiles(entry["files"], volume, root)
    for directory in entry["directories"]:
        mkdir(os.path.join(root,entry["directories"][directory]["name"])) 
        ProcessFolder(entry["directories"][directory],volume,root)
        
def ProcessFiles(entry,volume, root):
    '''
        Process Files Entries
    '''
    for file in entry:
        filepath = os.path.join(root,entry[file]["name"])
        print "Extracting file %s" %filepath
        f = open(filepath, "wb")
        volume.seek(entry[file]["offset"])
        data = volume.read(entry[file]["size"])
        f.write(data)
        f.close()
    
