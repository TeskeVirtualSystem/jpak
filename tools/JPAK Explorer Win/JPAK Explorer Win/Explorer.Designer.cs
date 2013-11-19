namespace JPAK
{
    partial class Explorer
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.loadbutton = new System.Windows.Forms.Button();
            this.dataView = new System.Windows.Forms.ListView();
            this.exportFileDialog = new System.Windows.Forms.SaveFileDialog();
            this.openFile = new System.Windows.Forms.OpenFileDialog();
            this.description = new System.Windows.Forms.Label();
            this.SuspendLayout();
            // 
            // loadbutton
            // 
            this.loadbutton.Location = new System.Drawing.Point(330, 422);
            this.loadbutton.Name = "loadbutton";
            this.loadbutton.Size = new System.Drawing.Size(75, 23);
            this.loadbutton.TabIndex = 0;
            this.loadbutton.Text = "Load File";
            this.loadbutton.UseVisualStyleBackColor = true;
            this.loadbutton.Click += new System.EventHandler(this.loadfile_Click);
            // 
            // dataView
            // 
            this.dataView.GridLines = true;
            this.dataView.Location = new System.Drawing.Point(12, 25);
            this.dataView.Name = "dataView";
            this.dataView.Size = new System.Drawing.Size(702, 391);
            this.dataView.TabIndex = 2;
            this.dataView.UseCompatibleStateImageBehavior = false;
            this.dataView.DoubleClick += new System.EventHandler(this.dataView_DoubleClick);
            // 
            // openFile
            // 
            this.openFile.Filter = "JPAK Volumes (*.jpak)|*.jpak";
            // 
            // description
            // 
            this.description.AutoSize = true;
            this.description.Location = new System.Drawing.Point(12, 9);
            this.description.Name = "description";
            this.description.Size = new System.Drawing.Size(85, 13);
            this.description.TabIndex = 3;
            this.description.Text = "Load a JPAK file";
            // 
            // Explorer
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(726, 450);
            this.Controls.Add(this.description);
            this.Controls.Add(this.dataView);
            this.Controls.Add(this.loadbutton);
            this.Name = "Explorer";
            this.Text = "JPAK Explorer";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button loadbutton;
        private System.Windows.Forms.ListView dataView;
        private System.Windows.Forms.SaveFileDialog exportFileDialog;
        private System.Windows.Forms.OpenFileDialog openFile;
        private System.Windows.Forms.Label description;
    }
}

