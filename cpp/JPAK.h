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
	void GetFile(string &, char *);
};

#endif /* JPAK_H_ */
