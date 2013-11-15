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
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.IO;
using Newtonsoft.Json.Linq;

namespace JPAK
{
    public partial class Explorer : Form
    {
        ImageList TypeImages;
        DirectoryEntry root;
        DirectoryEntry currentdir;
        FileStream fileVol;

        public Explorer()
        {
            InitializeComponent();
        }
        private void UpdateView(ListView view, DirectoryEntry dir)
        {
            view.Items.Clear();
            String[] tmp = dir.path.Split('/');
            String backpath = tmp.Length > 1 ? String.Join("/", Extensions.SubArray(tmp, 0, tmp.Length - 1)) : "/";
            if (dir != root)
            {
                ListViewItem backdir = new ListViewItem("..");
                backdir.Name = backpath;
                backdir.ImageKey = "folder";
                view.Items.Add(backdir);
            }
            view.LargeImageList = TypeImages;
            view.SmallImageList = TypeImages;
            foreach (DirectoryEntry dire in dir.directories)
            {
                ListViewItem f = new ListViewItem(dire.name);
                f.Name = dire.path;
                f.ImageKey = "folder";
                view.Items.Add(f);
            }
            foreach (FileEntry file in dir.files)
            {
                ListViewItem f = new ListViewItem(file.name);
                f.Name = file.path;
                f.ImageKey = JPAKTool.GetFileExt(file.name);
                view.Items.Add(f);
            }
            
        }
        private void loadfile_Click(object sender, EventArgs e)
        {
            TypeImages = JPAKTool.GetFileTypeImageList();
            if (fileVol != null)
                fileVol.Close();
            DialogResult result = openFile.ShowDialog();
            if (result == DialogResult.OK)
            {
                fileVol = File.Open(openFile.FileName, FileMode.Open);
                if (JPAKTool.CheckJPAK(fileVol))
                {
                    root = JPAKTool.GetFileTable(fileVol);
                    currentdir = root;
                    UpdateView(dataView, root);
                    description.Text = "Double click on a file to export";
                }
                else
                {
                    MessageBox.Show("Error: Invalid JPAK file!");
                }
            }
            else
            {
                description.Text = "Load a JPAK file";
            }
        }

        
        private void dataView_DoubleClick(object sender, EventArgs e)
        {
            ListViewItem item = dataView.SelectedItems[0];
            if (item.ImageKey.Equals("folder"))
            {
                String[] folders = item.Name.ToString().Split('/');
                DirectoryEntry newdir = root.GetFolder(Extensions.SubArray(folders,1,folders.Length-1));
                UpdateView(dataView, newdir);
                currentdir = newdir;
            }
            else
            {
                String[] path = item.Name.Split('/');
                String filename = Extensions.SubArray(path, path.Length - 1, 1)[0];
                FileEntry file = currentdir.GetFile(filename);
                exportFileDialog.FileName = filename;
                exportFileDialog.Title = "Select where to save the file.";
                DialogResult result = exportFileDialog.ShowDialog();
                if (result == DialogResult.OK)
                {
                    JPAKTool.ExportFile(fileVol, exportFileDialog.FileName, file.offset, file.size);
                    MessageBox.Show(exportFileDialog.FileName);
                }
            }
 
        }
    }
}
