/*
 * JPAK.cpp
 *
 *  Created on: 19/11/2013
 *      Author: lucas
 */

#include "JPAK.h"

/*	Extensions to help	*/
/*	I got this from http://stackoverflow.com/a/236803	*/
vector<string> &split(const string &s, char delim, vector<string> &elems) {
    std::stringstream ss(s);
    std::string item;
    while (std::getline(ss, item, delim)) {
        elems.push_back(item);
    }
    return elems;
}


vector<string> split(const string &s, char delim) {
    vector<string> elems;
    split(s, delim, elems);
    return elems;
}

/*	JPAK Stuff */
JPAK::JPAK() {
	ready = false;
}

JPAK::~JPAK() {
	if(jpakfile.is_open())
		jpakfile.close();
	root.clear();
}
bool JPAK::ProcessTable(string &table)	{
	bool ok = reader.parse(table.c_str(), root);
	if(!ok)
		cout << "Failed to parse table: " << reader.getFormattedErrorMessages() << endl;
	return ok;
}
bool JPAK::LoadFromFile(string &filename)	{
	char magic[5];
	unsigned int tableoffset;
	unsigned int fsize = 0;
	jpakfile.open(filename.c_str());
	if(jpakfile.good())	{
		jpakfile.read(magic,5);
		if(strncmp("JPAK1",magic,5) == 0)	{
			jpakfile.seekg(0,ios_base::end);
			fsize = jpakfile.tellg();
			jpakfile.seekg(-4,ios_base::end);
			jpakfile.read((char *)&tableoffset, 4);
			jpakfile.seekg(tableoffset, ios_base::beg);
			char table[fsize-tableoffset-3];
			jpakfile.read(table, fsize-tableoffset-4);
			table[fsize-tableoffset-4] = 0x00;
			string table_s = table;
			jpakfile.seekg(0,ios_base::beg);
			if(ProcessTable(table_s))	{
				ready = true;
				return true;
			}else{
				cout << "Cannot parse JPAK Table!" << endl;
				return false;
			}
		}else{
			cout << "Invalid JPAK file! " << endl;
			return false;
		}
	}else{
		cout << "Cannot open file " << filename << endl;
		return false;
	}
}

void JPAK::DecompressFile(char *in, char** out)	{
	// TODO: Zlib decompressor
}

void JPAK::PrintTree(Json::Value &outroot)	{
	Json::Value files = outroot["files"];
	Json::Value dirs  = outroot["directories"];
	cout << "Files: " << endl;
	for(auto file: files)	{
		cout << " - " << file["name"] << endl;
	}

	cout << "Dirs: " << endl;
	for(auto dir: dirs)	{
		cout << " - " << dir["name"] << endl;
		PrintTree(dir);
	}
}

void JPAK::PrintTree()	{
	PrintTree(root);
}

Json::Value JPAK::FindFileEntry(vector<string> &path, Json::Value &root)	{
	if(path.size() == 1)	{
		return root["files"].get(path[0], JPAK_NOT_FOUND_DATA);
	}else{
		string nextdir = path[0];
		path.erase(path.begin());
		if(root["directories"].get(nextdir, JPAK_NOT_FOUND_DATA) != "JPAK_NOT_FOUND_DATA")
			return FindFileEntry(path, root["directories"][nextdir]);
		else
			return Json::Value(JPAK_NOT_FOUND_DATA);
	}
}
bool JPAK::GetFile(string &path, char **buffer, int *size)	{
	vector<string> paths = split(path, '/');
	//	Here is relative to root, so the first will be blank if starts with "/"
	if(paths[0].size() == 0)
		paths.erase(paths.begin());

	Json::Value fileentry = FindFileEntry(paths, root);
	if(fileentry != JPAK_NOT_FOUND_DATA)	{
		jpakfile.seekg(fileentry["offset"].asInt(), ios_base::beg);
		*buffer = new char[fileentry["size"].asInt()];
		jpakfile.read(*buffer, fileentry["size"].asInt());
		*size = fileentry["size"].asInt();
		return true;
	}else{
		cout << "File not found: " << path << endl;
		return false;
	}
}
