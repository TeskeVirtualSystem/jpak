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
using System.IO;
using System.Web.Script.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Windows.Forms;
using System.IO;
using System.Reflection;
using System.Drawing;

namespace JPAK
{
    public class JPAKTool
    {
        // The File Types Image list
        static ImageList FileTypes;
        
        // The File Extensions Map. {extension, imagefile}
        static Dictionary<string, string> FileExts = new Dictionary<string, string>()
        {
            {"all","binary"},
            {"a","applix"},
            {"c","source_c"},
            {"cpp","source_cpp"},
            {"js","source"},
            {"f","source_f"},
            {"h","source_h"},
            {"j","source_j"},
            {"java","source_java"},
            {"l","source_l"},
            {"o","source_o"},
            {"p","source_p"},
            {"php","source_php"},
            {"pl","source_pl"},
            {"py","source_py"},
            {"s","source_s"},
            {"sh","shellscript"},
            {"doc","document"},
            {"xls","spreadsheet"},
            {"odt","document"},
            {"ods","spreadsheet"},
            {"tar","tar"},
            {"gz","tar"},
            {"zip","tar"},
            {"jpak","tar"},
            {"jpg","image"},
            {"jpeg","image"},
            {"png","image"},
            {"gif","image"},
            {"mp3","sound"},
            {"ogg","sound"},
            {"wav","sound"},
            {"avi","video"},
            {"mp4","video"},
            {"ogv","video"},
            {"mpg","video"},
            {"mkv","video"},
            {"txt","txt2"},
            {"iso","cdtrack"},
            {"ttf","font_type1"},
            {"html","html"},
            {"htm","html"},
            {"mid","midi"},
            {"midi","midi"},
            {"tpl","templates"},
            {"coord","templates"},
            {"folder","folder"}
        };

        // This function builds the image list
        static void BuildFileTypeImageList()
        {
            FileTypes = new ImageList();
            FileTypes.ImageSize = new Size(32, 32);
            System.Resources.ResourceManager myManager = new
            System.Resources.ResourceManager("JPAK.FileImages", Assembly.GetExecutingAssembly());
            foreach (KeyValuePair<String, String> entry in FileExts)
                FileTypes.Images.Add(entry.Key, (Image)myManager.GetObject(entry.Value));
        }

        //Builds the image list if its necessary, and returns it
        public static ImageList GetFileTypeImageList()    
        {
            if (FileTypes == null)
                BuildFileTypeImageList();

            return FileTypes;
        }

        //Returns the compatible file extension to use with imagelist
        public static String GetFileExt(String filename)
        {
            String[] extarray = filename.Split('.');
            String ext = extarray[extarray.Length - 1];
            if (extarray.Length == 1)
                return "all";
            foreach (KeyValuePair<String, String> entry in FileExts)
                if (entry.Key.Equals(ext))
                    return ext;
            return "all";
        }

        //Exports a file from JPAK Volume
        public static void ExportFile(FileStream volume, String filepath, int offset, int size)
        {
            FileStream fs = File.Create(filepath, 2048, FileOptions.None);
            volume.Seek(offset, SeekOrigin.Begin);
            byte[] buffer = new byte[2048];
            int readsize = 0;
            int chunksize = 2048;
            while (readsize < size)
            {
                chunksize = size - readsize > 2048 ? 2048 : size - readsize;
                volume.Read(buffer, 0, chunksize);
                fs.Write(buffer, 0, chunksize);
                readsize += chunksize;
            }
            fs.Close();
        }

        //Checks the magic number of JPAK
        public static bool CheckJPAK(FileStream volume)
        {
            volume.Seek(0, SeekOrigin.Begin);
            byte[] MagicNumber = new byte[5];
            volume.Read(MagicNumber, 0, 5);
            volume.Seek(0, SeekOrigin.Begin);
            String magic = Encoding.UTF8.GetString(MagicNumber);
            return (magic.Equals("JPAK1")); 
              
        }

        //Gets the filetable tree from JPAK File
        public static DirectoryEntry GetFileTable(FileStream volume)
        {
            volume.Seek(-4, SeekOrigin.End);
            byte[] bOffset = new byte[4];
            volume.Read(bOffset, 0, 4);
            int Offset = BitConverter.ToInt32(bOffset, 0);
            volume.Seek(0, SeekOrigin.End);
            long VolumeSize = volume.Position;
            volume.Seek(Offset, SeekOrigin.Begin);
            byte[] filetable = new byte[VolumeSize - Offset - 4];
            volume.Read(filetable, 0, (int)(VolumeSize - Offset - 4));
            String jsonstr = Encoding.UTF8.GetString(filetable);
            return ParseJSONDirectory(jsonstr);
        }
        //Gets the filetable jsonstring from JPAK File
        public static String GetFileTableS(FileStream volume)
        {
            volume.Seek(-4, SeekOrigin.End);
            byte[] bOffset = new byte[4];
            volume.Read(bOffset, 0, 4);
            int Offset = BitConverter.ToInt32(bOffset, 0);
            volume.Seek(0, SeekOrigin.End);
            long VolumeSize = volume.Position;
            volume.Seek(Offset, SeekOrigin.Begin);
            byte[] filetable = new byte[VolumeSize - Offset - 4];
            volume.Read(filetable, 0, (int)(VolumeSize - Offset - 4));
            String jsonstr = Encoding.UTF8.GetString(filetable);
            return jsonstr;
        
        }
        //Parses a JSON String representing a directory entry
        public static DirectoryEntry ParseJSONDirectory(String dirjson)
        {
            JObject jdec = JsonConvert.DeserializeObject<JObject>(dirjson);
            return GetFileTree(jdec, jdec["name"].ToString(), jdec["path"].ToString());
        }

        //Returns the Directory Tree
        
        public static DirectoryEntry GetFileTree(JObject FileTable)
        {
            return GetFileTree(FileTable, "root", "/");
        }
        public static DirectoryEntry GetFileTree(JObject FileTable, String name, String path)
        {
            DirectoryEntry root = new DirectoryEntry(name, path);
            foreach (JProperty file in FileTable["files"])
            {
                FileEntry f = file.Value.ToObject<FileEntry>();
                root.AddFile(f);
            }
            foreach (JProperty dir in FileTable["directories"])
            {
                String jdir = dir.Value.ToString();
                DirectoryEntry d = ParseJSONDirectory(jdir);
                root.AddDirectory(d);
            }
            return root;
        }
    }
}
