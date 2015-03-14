         _ ____   _    _  __        ____    ___  
        | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
     _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
    | |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
     \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                                                       
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak

#JPAK v2.0 Specification File

#####   1.0 Filesystem Specification
The JPAK2.0 uses about the same structure than JPAK1.0 but now it supports table encryption and specify a nested encryption. The Filesystem Table uses is a JSON with the root node being a directory entry. The directory is as follow:

    direntry    =   { 
        "name"          :   DIRNAME,                //  Ndame of this folder
        "path"          :   DIRPATH,                //  Path for this folder
        "numfiles"      :   DIRNUMFILES,            //  Number of files in root of this folder
        "directories"   :   DIRSUBDIRECTORIES,      //  It's an array [] with directory objects like direntry
        "files"         :   DIRFILES                //  It's an array [] with file objects like fileentry
        "aeskey"        :   AESKEY                  //  Folder key if != false
    };

And for the file entries:

    fileentry   =   {   
        "name"          :   FILENAME,               //  File Name
        "path"          :   FILEPATH,               //  File Path
        "offset"        :   FILEOFFSET,             //  Absolute offset in the jpak file
        "size"          :   FILESIZE                //  The file size
        "aeskey"        :   AESKEY                  //  File key if != false
        "zlib"          :   FALSE/TRUE              //  If file is compressed
        "md5"           :   MD5SUM                  //  Uncompresssed/unencrypted file MD5SUM
    }

The filesystem table can be either encrypted, compressed, both, or nothing. This is specified by **JPAK FLAGS** (see 2.X)
Example of JPAK Filesystem Table:

    {
        'name': 'packtest',
        'path': '/',
        'numfiles': 3,
        'size': 0,
        'files': {
            'whatisthis': {
                'path': '/whatisthis',
                'offset': 13,
                'name': 'whatisthis',
                'size': 55
            },
            'test.html': {
                'path': '/test.html',
                'offset': 81,
                'name': 'test.html',
                'size': 49
            },
        },
        'directories': {
            '3': {
                'path': '/3',
                'directories': { },
                'name': '3',
                'numfiles': 1
                'files': {
                    't': {
                        'path': '/3/t',
                        'offset': 9104,
                        'name': 't',
                        'size': 0
                    }
                },
            },
        }
    }
#####   2.0 JPAK File

The JPAK has following structure:

|   START   |    END    |          Description              |
| --------- | --------- | --------------------------------- |
|    0x0    |    0x5    | JPAK2 Magic Number                |
|    0x5    |    0xC    | Padding (0x00)                    |
|    0xC    |    0xY    | Start of Files Data               |
|  0x**Y**  |  0x**X**  | JSON File Table                   |
|  0x**X**  |  0x**W**  | `uint32_t` Producer ID (Look 2.1) |
|  0x**X**  |  0x**W**  | `uint32_t` JPAK Flags (Look 2.1)  |
|  0x**W**  |  0x**Z**  | `uint32_t` User Flags (Look 2.1)  |
|  0x**Z**  |   `END`   | `uint32_t` JSON FileTable Offset  |

#####   2.1 JPAK / USER FLAGS and Producer ID
    
The JPAK Flags was implemented to support file table encryption, scrambling and compressing. We have two Flag types `JPAK` and `USER`. The `USER FLAGS` can be anything the user wants. This could be set for identifying a proprietary encryption for example. The `JPAK FLAGS` bitmask is organized in this way:

|  D7  |  D6  |  D5  |  D4  |  D3  |  D2  |  D1  |  D0  |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| AES  | ZLIB |  XOR |  F   |  Z   |  Z   |  Z   |  Z   |

*   `AES`   -   The Filetable is AES Encrypted
*   `ZLIB`  -   The Filetable is ZLib Compressed
*   `XOR`   -   The Filetable uses an **XORpad**
*   `F`     -   The filetable encryption key/xorpad is used on files
*   `Z`     -   Reserved for future use

The `Producer ID` is a (ideally) **unique** ID from who created the JPAK file. It's meant to be used together with `USER FLAGS`.


#####  3.0 Encryption / Compressing
    
The AES Encryption used on JPAK2.0 is **AES-256-CTR**. The filetable can be both encrypted and compressed. For this case we will **first** compress then encrypt the data. We can also use xorpads for obfuscation of data. For `AES`, `ZLIB`, `XOR` flags enable the order of processing will follow:
    
    DATA -> ZLIB -> AES -> XORPAD
    
We refer the filetable key as **masterkey**

For the file encryption we can have these cases:

*   File Key, Directory Key, `F FLAG` unset :   In this mode, the file is unencrypted
*   `F FLAG` set, File Key, Directory Key : In this mode, the file is encrypted using **master key**
*   Directory Key and `F FLAG` set, File Key unset : In this mode we use DIRKEY + MASTER_KEY in encryption
*   File Key, Directory Key, `F FLAG` set : In this mode we use FILEKEY + DIRKEY + MASTERKEY in encryption

####    4.0 Data File and Filetable File in Extended Mode

In extended mode the owner of a jpak file is able to share its datafile with other user just by creating another filetable with only the keys owner want to share. Then on the cloud backend they can have a common datafile. 
So in `Extended Environment` we have following pieces:
*   `OWNER` -   The Datafile Owner/Creator. It has all keys for all files
*   `JPAK DATA STORAGE (JDS)` - The data only file storage
*   `JPAK META STORAGE (JMS)` - The meta storage ( filetable )

For more specification of Extended Mode, see Extended Mode README.md
