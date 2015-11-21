#!/usr/bin/env python

'''
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/TeskeVirtualSystem/jpak

'''
import struct, os, json, sys, zlib, md5, base64
from Crypto import Random
from Crypto.Cipher import AES
from Crypto.Util import Counter

BLOCK_SIZE = 16 * 1024 * 1024   #   16 MB

def GenKey(base=None):
    '''
        Generates a 32 byte random key and does an xorpad with base
    '''
    if base == None:
        base = "\x00"*32
    rnd = Random.new()
    key = rnd.read(32)
    key = MergeKeys(key, base)
    return key

def B64E(data):
    '''
        Encodes data using base64
    '''
    return base64.b64encode(data)

def B64D(data):
    '''
        Decodes data using base64
    '''
    return base64.b64decode(data)

def MergeKeys(key0, key1):
    '''
        Merge key0 and key1 with XOR/MOD
    '''
    return MOD(XOR(key0, key1), key1) 

def EncryptCTR(data, key, ctr=None):
    '''
        Encrypts the data using AES-256-CTR
        Auto-pads the key for 32 bytes or crop the key
    '''
    if len(key) < 32:
        key += "\x00"*(32-len(key))
    elif len(key) >= 32:
        key = key[:32]
    key = str(key)
    if ctr == None:
        ctr = Counter.new(nbits=128)
    encryptor = AES.new(key, AES.MODE_CTR, counter=ctr)
    return encryptor.encrypt(data), ctr

def DecryptCTR(data, key, ctr=None):
    '''
        Decrypts the data using AES-256-CTR
        Auto-pads the key for 32 bytes or crop the key
    '''
    if len(key) < 32:
        key += "\x00"*(32-len(key))
    elif len(key) >= 32:
        key = key[:32]

    key = str(key)
    if ctr == None:
        ctr = Counter.new(nbits=128)
    encryptor = AES.new(key, AES.MODE_CTR, counter=ctr)
    return encryptor.decrypt(data), ctr

def XOR(data, xorpad):
    '''
        Does an XOR with data and xorpad
    '''
    data = bytearray(data)
    xorpad = bytearray(xorpad)
    xl = len(xorpad)
    for i in range(len(data)):
        data[i] ^= xorpad[i%xl]
    return data

def MOD(data, modpad):
    '''
        Does an modulus with data and modpad
    '''
    data = bytearray(data)
    modpad = bytearray(modpad)
    xl = len(modpad)
    for i in range(len(data)):
        data[i] %= modpad[i%xl] if modpad[i%xl] != 0 else 256
    return data

def ADD(data, addpad):
    '''
        Does an ADD with data and xorpad
    '''
    data = bytearray(data)
    addpad = bytearray(addpad)
    xl = len(addpad)
    for i in range(len(data)):
        data[i] += addpad[i%xl]
    return data

def Compress(data):
    '''
        Compresses data using zlib
    '''
    return zlib.compress(data)

def Uncompress(data):
    '''
        Uncompresses data using zlib
    '''
    return zlib.decompress(data)

def MD5Sum(data, hash=None):
    '''
        if hash == None, returns the data MD5Sum
        if hash != None, returns data md5sum == hash
    '''
    m = md5.new()
    m.update(data)
    hash_t = m.hexdigest().upper()
    if hash != None:
        return hash.upper() == hash_t
    else:
        return hash

def GetFileTable(volume, ver=2, key=None, compress=None):
    '''
        Gets the file table.
        Returns: the JSON file table
    '''
    if ver == 1:
        volume.seek(-4, 2)
        filetableoffset = struct.unpack("<I",volume.read(4))[0]
        volume.seek(0,2)
        size = volume.tell()
        volume.seek(filetableoffset)
        filetable = volume.read(size-filetableoffset-4) 
        volume.seek(0)
        return json.loads(filetable)   
    elif ver == 2:
        volume.seek(-4, 2)
        filetableoffset = struct.unpack("<I",volume.read(4))[0]
        volume.seek(0, 2)
        size = volume.tell()
        volume.seek(0)
        volume.seek(filetableoffset)
        filetable = volume.read(size-filetableoffset-16)
        if key != None and key != False and key != True:
            filetable, ctr = DecryptCTR(filetable, key)
        if compress:
            filetable = Uncompress(filetable)
        volume.seek(0)
        return json.loads(filetable) 
    else:
        print "Unknown Version %s" %ver

def GetFlags(volume):
    '''
        Returns an tuple with ProducerID, JPAK Flags, UserFlags
    '''
    volume.seek(-16, 2)
    ProducerID, JPAKFlags, UserFlags = struct.unpack("<3I",volume.read(12))
    volume.seek(0)
    return ProducerID, JPAKFlags, UserFlags

def GetVolumeTable(metadata):
    '''
        Return volume table from a JMS file
    '''
    volume.seek(-4, 2)
    filetableoffset = struct.unpack("<I",metadata.read(4))[0]
    metadata.seek(0xC)  #   Start of volume table
    volumetable = metadata.read(filetableoffset-0xC-1)
    metadata.seek(0)
    return json.loads(volumetable)

def ParseJPAKFlags(flags):
    return {
        "AES"   :   ((flags&128) >> 7) == 1,
        "ZLIB"  :   ((flags&64)  >> 6) == 1,
        "XOR"   :   ((flags&32)  >> 5) == 1,
        "F"     :   ((flags&16)  >> 4) == 1
    }

def GenJPAKFlags(_AES = False, _ZLIB = False, _XOR = False, _F = False):
    return (1 if _AES else 0) << 7 | (1 if _ZLIB else 0) << 6 | (1 if _XOR else 0) << 5 | (1 if _F else 0) << 4

def AddToVolume(filepath, volume, key=None, compress=False):
    '''
        Add File to volume
        Return: (offset, size)
    '''
    f = open(filepath, "rb")
    f.seek(0,2)
    fsize = f.tell()
    f.seek(0)
    dread = 0

    ctr = None

    m = md5.new()

    offset = volume.tell()
    while dread < fsize: 
        readlen = BLOCK_SIZE if (fsize-dread) > BLOCK_SIZE else (fsize-dread) 
        data = f.read(readlen)
        m.update(data)

        if compress == True:                                #   Compress if asked
            data = Compress(data)

        if key != None and key != False:                     #   Encrypt if has key
            data, ctr = EncryptCTR(data, key, ctr)
            
        volume.write(data)
        dread += readlen

    f.close()
    return offset, volume.tell()-offset,  m.hexdigest().upper()

def AddDataToVolume(data, volume, key=None, compress=False):
    '''
        Add Data to Volume
        Return: (offset, size)
    '''
    offset = volume.tell()
    
    if compress == True:
        data = Compress(data)

    if key != None:
        data, ctr = EncryptCTR(data, key)

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

def ProcessFolder(entry,volume,root,version=2,compress=False):
    '''
        Process a Folder entry
    '''
    if version == 1:
        root = root + entry["name"] +"/"
        ProcessFiles(entry["files"], volume, root, version )
        for directory in entry["directories"]:
            mkdir(os.path.join(root,entry["directories"][directory]["name"])) 
            ProcessFolder(entry["directories"][directory],volume,root,version,compress)
    elif version == 2:
        root = root + entry["name"] +"/"
        if entry["key"] == True:
            print "Cannot decrypt folder %s" %root
            return
        else:
            ProcessFiles(entry["files"], volume, root, version, entry["key"], compress)
            for directory in entry["directories"]:
                mkdir(os.path.join(root,entry["directories"][directory]["name"])) 
                ProcessFolder(entry["directories"][directory],volume,root,version,compress)
        
def ProcessFiles(entry,volume,root,version=2,rootkey=None,compress=False):
    '''
        Process Files Entries
    '''
    if version == 1:
        for file in entry:
            filepath = os.path.join(root,entry[file]["name"])
            print "Extracting file %s" %filepath
            f = open(filepath, "wb")
            volume.seek(entry[file]["offset"])
            data = volume.read(entry[file]["size"])
            f.write(data)
            f.close()
    elif version == 2:
        for file in entry:
            filepath = os.path.join(root,entry[file]["name"])
            if entry[file]["key"] == True:
                print "Cannot decrypt file %s" %filepath
                return
            else:
                if entry[file]["key"] == None or entry[file]["key"] == False:
                    filekey = None
                elif rootkey == None:
                    filekey = B64D(entry[file]["key"])
                else:
                    filekey = MergeKeys(B64D(entry[file]["key"]), B64D(rootkey))
                print "Extracting file %s" %filepath
                f = open(filepath, "wb")
                volume.seek(entry[file]["offset"])
                size = entry[file]["size"]
                wread = 0
                ctr = None
                m = md5.new()
                while wread < size:
                    readlen = BLOCK_SIZE if (size - wread) > BLOCK_SIZE else (size - wread)
                    data = volume.read(readlen)
                    if filekey != None:
                        data, ctr = DecryptCTR(data, filekey, ctr)
                    if compress:
                        data = Uncompress(data)
                    m.update(data)
                    f.write(data)
                    wread += readlen
                print "HASH: %s" %("OK" if m.hexdigest().upper()==entry[file]["md5"] else "FAIL")
                f.close()

    
