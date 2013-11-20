/*
 * JPAK.h
 *
 *  Created on: 19/11/2013
 *      Author: lucas
 */

#ifndef JPAK_H_
#define JPAK_H_

#include <jsoncpp/json/json.h>
#include <string.h>
#include <map>
#include <iostream>
#include <sstream>
#include <fstream>
#include <string>

#define JPAK_NOT_FOUND_DATA "NOT_FOUND_ON_JPAK"		//	Constant that is returned as Json::Value when not found

using namespace std;
class JPAK {
private:
	Json::Value root;
	Json::Reader reader;
	ifstream jpakfile;
	bool ready;
	bool ProcessTable(string &);
public:
	JPAK();
	virtual ~JPAK();

	bool LoadFromFile(string &);
	bool GetFile(string &, char **, int *);
	bool GetFile(const char *path, char **buf, int *size) { string t = path; return GetFile(t,buf,size); };
	void DecompressFile(char *, char**);
	void PrintTree(Json::Value &);
	void PrintTree();

	Json::Value FindFileEntry(vector<string> &, Json::Value &);
};

#endif /* JPAK_H_ */
