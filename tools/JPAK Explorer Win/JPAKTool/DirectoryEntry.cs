/**********************************************
 *     _ ____   _    _  __        _   ___     *
 *    | |  _ \ / \  | |/ / __   _/ | / _ \    *
 * _  | | |_) / _ \ | ' /  \ \ / / || | | |   *
 *| |_| |  __/ ___ \| . \   \ V /| || |_| |   *
 * \___/|_| /_/   \_\_|\_\   \_/ |_(_)___/    *
 *                                            *
 *Multiuse Javascript Package                 *
 *By: Lucas Teske                             *
 *https://github.com/racerxdl/jpak            *
 **********************************************/
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace JPAK
{
    public class DirectoryEntry
    {
        public String name, path;
        public int numfiles, size;
        public List<DirectoryEntry> directories;
        public List<FileEntry> files;

        public DirectoryEntry(String name, String path)
        {
            this.name = name;
            this.path = path;
            this.files = new List<FileEntry>();
            this.directories = new List<DirectoryEntry>();
        }

        public void AddFile(String name, String path, int size, int offset)
        {
            FileEntry newFile = new FileEntry(name, path, size, offset);
            this.files.Add(newFile);
            this.numfiles++;
        }
        public void AddFile(FileEntry file)
        {
            this.files.Add(file);
            this.numfiles++;
        }
        public void AddDirectory(String name, String path)
        {
            DirectoryEntry newDir = new DirectoryEntry(name, path);
            this.directories.Add(newDir);
        }
        public void AddDirectory(DirectoryEntry dir)
        {
            this.directories.Add(dir);
        }

        //  This Generates a Tree String for all files and subdirectories
        public String GenTreeText()
        {
            return this.GenTreeText(0);
        }

        public String GenTreeText(int level)
        {
            String tabbing = "";
            String TreeText = "";
            for (int i = 0; i < level; i++)
                tabbing += " ";

            TreeText += tabbing + this.ToString() + "\r\n";
            tabbing += " ";

            foreach(FileEntry f in this.files)    
                TreeText += tabbing + f.ToString() + "\r\n";

            foreach (DirectoryEntry d in this.directories)
                TreeText += d.GenTreeText(level + 1);

            return TreeText;
        }

        //Gets a DirectoryEntry Folder by folder path.
        //Returns null if not found
        public DirectoryEntry GetFolder(String[] folder)
        {
            if (folder.Length == 0)
                return this;
            foreach (DirectoryEntry dir in this.directories)
                if(dir.name.Equals(folder[0]))
                    return dir.GetFolder(Extensions.SubArray(folder, 1, folder.Length-1));
            return null;
        }

        //Gets a FileEntry by filename
        //Returns null if not found
        public FileEntry GetFile(String filename)
        {
            foreach (FileEntry file in this.files)
                if (file.name.Equals(filename))
                    return file;
            return null;
        }
        public override string ToString()
        {
            return "JPAK.DirectoryEntry(\"" + this.name + "\",\"" + this.path + "\") : Files: "+this.files.Count+" Directories: "+this.directories.Count;
        }     
    }
}
