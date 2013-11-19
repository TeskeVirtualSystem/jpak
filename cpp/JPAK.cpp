/*
 * JPAK.cpp
 *
 *  Created on: 19/11/2013
 *      Author: lucas
 */

#include "JPAK.h"

JPAK::JPAK() {
	// TODO Auto-generated constructor stub

}

JPAK::~JPAK() {
	// TODO Auto-generated destructor stub
}
bool JPAK::ProcessTable(string &table)	{
	return reader.parse(table.c_str(), root);
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
			jpakfile >> tableoffset;
			jpakfile.seekg(tableoffset, ios_base::beg);
			char table[fsize-tableoffset-4];
			jpakfile.read(table, fsize-tableoffset-4);
			string table_s = table;
			if(ProcessTable(table_s))	{
				ready = true;
				return false;
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

void JPAK::GetFile(string &path, char *buffer)	{

}
