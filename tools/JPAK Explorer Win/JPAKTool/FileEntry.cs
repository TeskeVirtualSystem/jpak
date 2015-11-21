/**********************************************
 *     _ ____   _    _  __        _   ___     *
 *    | |  _ \ / \  | |/ / __   _/ | / _ \    *
 * _  | | |_) / _ \ | ' /  \ \ / / || | | |   *
 *| |_| |  __/ ___ \| . \   \ V /| || |_| |   *
 * \___/|_| /_/   \_\_|\_\   \_/ |_(_)___/    *
 *                                            *
 *Multiuse Javascript Package                 *
 *By: Lucas Teske                             *
 *https://github.com/TeskeVirtualSystem/jpak  *
 **********************************************/
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace JPAK
{
    public class FileEntry
    {
        public String name, path;
        public int size, offset;
        public bool compressed;    //  Future Use - TODO
        public FileEntry() { }
        public FileEntry(String name, String path, int size, int offset)
        {
            this.name = name;
            this.path = path;
            this.size = size;
            this.offset = offset;
        }
        public FileEntry(String name, String path, int size, int offset, bool compressed)
        {
            this.name = name;
            this.path = path;
            this.size = size;
            this.offset = offset;
            this.compressed = compressed;
        }
        public override string ToString()
        {
            return "JPAK.FileEntry(\"" + this.name + "\",\"" + this.path + "\"," + this.size.ToString() + "," + this.offset.ToString() + "," + this.compressed.ToString() + ")";
        }        
    }
}
