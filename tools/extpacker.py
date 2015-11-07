#!/usr/bin/env python

print '''
     _ ____   _    _  __  _____      _     ____            _             
    | |  _ \ / \  | |/ / | ____|_  _| |_  |  _ \ __ _  ___| | _____ _ __ 
 _  | | |_) / _ \ | ' /  |  _| \ \/ / __| | |_) / _` |/ __| |/ / _ \ '__|
| |_| |  __/ ___ \| . \  | |___ >  <| |_  |  __/ (_| | (__|   <  __/ |   
 \___/|_| /_/   \_\_|\_\ |_____/_/\_\\__| |_|   \__,_|\___|_|\_\___|_|                                                      
                                                        
Multiuse Javascript Package 
By: Lucas Teske
https://github.com/racerxdl/jpak
'''


import struct, os, json, sys
from jpaktool import *

if len(sys.argv) > 3:
    metadata = sys.argv[1]
    volume = sys.argv[2]
    user_args = sys.argv[3:]
    if os.path.isfile(metadata):
      print "Metadata %s has been found. Appending volume %s to JPAK" %(metadata, volume)
else:
  print '''
Usage: python packer.py metadata.jms volumeX.jds folder ...
Ex: python packer.py myproject.jms volume0.jds /home/lucas/
This will generate myproject.jms (or append a new volume) with contents of folder /home/lucas'''
