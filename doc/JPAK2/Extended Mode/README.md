         _ ____   _    _  __        ____    ___  
        | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
     _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
    | |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
     \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                 
     _____      _                 _          _ 
    | ____|_  _| |_ ___ _ __   __| | ___  __| |
    |  _| \ \/ / __/ _ \ '_ \ / _` |/ _ \/ _` |
    | |___ >  <| ||  __/ | | | (_| |  __/ (_| |
    |_____/_/\_\\__\___|_| |_|\__,_|\___|\__,_|
                                               
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak

#JPAK v2.0 Extended Mode

#####   1.0 Filesystem Specification
The Extended Mode of JPAK is consisted of two new JPAK Format files: a **JDS** (JPAK Data Storage) and **JMS** (JPAK Meta Storage). The JPAK Data Storage is consisted about raw (or encrypted/compressed) data described by a JMS file. The struct is as follow:

|   START   |    END    |          Description              |
| --------- | --------- | --------------------------------- |
|    0x0    |    0x4    | JDS1 Magic Number                 |
|    0x4    |    0xC    | Padding (0x00)                    |
|    0xC    |    0xY    | Start of Files Data               |

The JPAK Meta Storage is similar to JPAK Filetable Structure, but aditionally has a volume list (JDK) for acessing the data storage. It has the follwing struct:

|    START     |      END      |                    Description                    |
| ------------ | ------------- | ------------------------------------------------- |
|  0x0         |  0x4          | JMS1 Magic Number                                 |
|  0x4         |  0xC          | Padding (0x00)                                    |
|  0xC         |  0x**U**      | JSON Volume Table                                 |
|  0x**U**     |  0x**W**      | JSON File Table                                   |
|  0x**X**     |  0x**X+4**    | `uint32_t` Producer ID (Look JPAK2.0 spec at 2.1) |
|  0x**X+4**   |  0x**X+8**    | `uint32_t` JPAK Flags  (Look JPAK2.0 spec at 2.1) |
|  0x**X+8**   |  0x**X+12**   | `uint32_t` User Flags  (Look JPAK2.0 spec at 2.1) |
|  0x**X+12**  |  `END`        | `uint32_t` JSON FileTable Offset                  |

The JSON Filetable is the same, the offset is relative to the first volume. The JSON Volume Table is as follow:

    {
        "vol0.jds" :   {
            "filename"  :   "vol0.jds",     //  Volume Filename
        },
        "vol1.jds" :   {
            "filename"  :   "vol1.jds",     //  Volume Filename
        }
    }

##### 2.0   File Sharing

The JPAK 2.0 Extended Mode supports file sharing across users keeping the same JPAK Data Storage file. This allows to save space and allows to share it across Cloud Storage accounts. For using the File Sharing mode the full key support must be enabled (Directory Key and File Key set for every file). This allows the owner to selective share only few files/directories with someone. To do so, the `owner` must decrypt is own file, wipe the keys of directories or files he doesn't want to share (set them to **TRUE**), and send to the client. The `client` itself should reencrypt the `Meta Storage` with his own `Master Key` and store it on its personal cloud/storage. Then the `owner` shares the Data Storage with that customer. So when a JPAK Reader reads the extended mode jpak, when it encounters a directory/file with the key set to boolean **TRUE** it will know its encrypted but it doesnt have the key, so it will give access denied.

