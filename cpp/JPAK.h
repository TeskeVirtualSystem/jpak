/*
 * JPAK.h
 *
 *  Created on: 19/11/2013
 *      Author: lucas
 */

#ifndef JPAK_H_
#define JPAK_H_

#include <json/json.h>
#include <cstring>
#include <iostream>
#include <sstream>
#include <fstream>
#include <string>
#include <vector>
#include <memory>

#define JPAK_NOT_FOUND_DATA "NOT_FOUND_ON_JPAK"

class JPAK {
public:
    JPAK();
    JPAK(const JPAK &);
    ~JPAK();

    bool LoadFromFile(const std::string &filename);
    bool GetFile(const std::string &path, char **buffer, int *size);
    bool GetFile(const char *path, char **buf, int *size);
    void DecompressFile(char *in, char **out);
    void PrintTree(const Json::Value &root);
    void PrintTree();

    Json::Value FindFileEntry(std::vector<std::string> &path, const Json::Value &root);
    std::vector<Json::Value> FindFileByExt(const std::string &ext, const Json::Value &folder);

    const std::string &GetFilename() const { return jpakfilename; }
    bool IsReady() const { return ready; }
    const Json::Value &GetRoot() const { return root; }

private:
    bool ProcessTable(const std::string &table);

    Json::CharReaderBuilder readerBuilder;
    Json::Value root;
    std::ifstream jpakfile;
    std::string jpakfilename;
    std::streamoff fileSize_;
    uint32_t tableOffset_;
    bool ready;
};

#endif /* JPAK_H_ */
