/*
 * JPAK.cpp
 *
 *  Created on: 19/11/2013
 *      Author: lucas
 */

#include "JPAK.h"
#include <algorithm>

static std::vector<std::string> split(const std::string &s, char delim) {
    std::vector<std::string> elems;
    std::istringstream ss(s);
    std::string item;
    while (std::getline(ss, item, delim)) {
        elems.push_back(item);
    }
    return elems;
}

JPAK::JPAK()
    : fileSize_(0), tableOffset_(0), ready(false)
{
}

JPAK::JPAK(const JPAK &jpak)
    : ready(false)
{
    if (!jpak.jpakfilename.empty())
        LoadFromFile(jpak.jpakfilename);
}

JPAK::~JPAK() {
    if (jpakfile.is_open())
        jpakfile.close();
}

bool JPAK::ProcessTable(const std::string &table) {
    std::unique_ptr<Json::CharReader> reader(readerBuilder.newCharReader());
    std::string errors;
    bool ok = reader->parse(table.data(), table.data() + table.size(), &root, &errors);
    if (!ok) {
        std::cerr << "Failed to parse table: " << errors << std::endl;
        root.clear();
    }
    return ok;
}

bool JPAK::LoadFromFile(const std::string &filename) {
    if (jpakfile.is_open()) {
        jpakfile.close();
    }
    jpakfile.clear();

    ready = false;
    root.clear();
    jpakfilename.clear();
    fileSize_ = 0;
    tableOffset_ = 0;

    jpakfile.open(filename.c_str(), std::ios::binary);
    if (!jpakfile.is_open()) {
        std::cerr << "Cannot open file " << filename << std::endl;
        return false;
    }

    char magic[5];
    jpakfile.read(magic, 5);
    if (!jpakfile.good() || std::strncmp("JPAK1", magic, 5) != 0) {
        std::cerr << "Invalid JPAK file!" << std::endl;
        jpakfile.close();
        return false;
    }

    jpakfile.seekg(0, std::ios::end);
    if (!jpakfile.good()) {
        std::cerr << "Failed to seek to end of file" << std::endl;
        jpakfile.close();
        return false;
    }

    fileSize_ = jpakfile.tellg();
    if (fileSize_ < 9) {
        std::cerr << "JPAK file too small" << std::endl;
        jpakfile.close();
        return false;
    }

    jpakfile.seekg(-4, std::ios::end);
    if (!jpakfile.good()) {
        std::cerr << "Failed to seek to table offset" << std::endl;
        jpakfile.close();
        return false;
    }

    jpakfile.read(reinterpret_cast<char *>(&tableOffset_), 4);
    if (!jpakfile.good()) {
        std::cerr << "Failed to read table offset" << std::endl;
        jpakfile.close();
        return false;
    }

    if (tableOffset_ >= static_cast<uint32_t>(fileSize_) - 4) {
        std::cerr << "Invalid table offset: " << tableOffset_
                  << " (file size: " << fileSize_ << ")" << std::endl;
        jpakfile.close();
        return false;
    }

    std::streamoff tableSize = fileSize_ - tableOffset_ - 4;
    if (tableSize <= 0 || tableSize > 128 * 1024 * 1024) {
        std::cerr << "Suspicious table size: " << tableSize << std::endl;
        jpakfile.close();
        return false;
    }

    std::vector<char> table(static_cast<std::size_t>(tableSize));
    jpakfile.seekg(tableOffset_, std::ios::beg);
    if (!jpakfile.good()) {
        std::cerr << "Failed to seek to table start" << std::endl;
        jpakfile.close();
        return false;
    }

    jpakfile.read(table.data(), tableSize);
    if (!jpakfile.good()) {
        std::cerr << "Failed to read table data" << std::endl;
        jpakfile.close();
        return false;
    }

    jpakfile.seekg(0, std::ios::beg);

    std::string tableStr(table.data(), static_cast<std::size_t>(tableSize));
    if (!ProcessTable(tableStr)) {
        jpakfile.close();
        return false;
    }

    jpakfilename = filename;
    ready = true;
    return true;
}

void JPAK::DecompressFile(char *in, char **out) {
    (void)in;
    (void)out;
}

void JPAK::PrintTree(const Json::Value &outroot) {
    const Json::Value &files = outroot["files"];
    const Json::Value &dirs  = outroot["directories"];

    std::cout << "Files:" << std::endl;
    for (const auto &file : files) {
        std::cout << " - " << file["name"].asString() << std::endl;
    }

    std::cout << "Dirs:" << std::endl;
    for (const auto &dir : dirs) {
        std::cout << " - " << dir["name"].asString() << std::endl;
        PrintTree(dir);
    }
}

void JPAK::PrintTree() {
    PrintTree(root);
}

Json::Value JPAK::FindFileEntry(std::vector<std::string> &path,
                                  const Json::Value &entryRoot) {
    if (path.size() == 1) {
        return entryRoot["files"].get(path[0], JPAK_NOT_FOUND_DATA);
    }

    std::string nextdir = path[0];
    path.erase(path.begin());

    const Json::Value &subdir = entryRoot["directories"].get(nextdir, JPAK_NOT_FOUND_DATA);
    if (subdir != JPAK_NOT_FOUND_DATA) {
        return FindFileEntry(path, subdir);
    }

    return Json::Value(JPAK_NOT_FOUND_DATA);
}

std::vector<Json::Value> JPAK::FindFileByExt(const std::string &ext,
                                               const Json::Value &folder) {
    std::vector<Json::Value> results;
    const Json::Value &files = folder["files"];
    for (const auto &entry : files) {
        std::string name = entry["name"].asString();
        if (name.size() >= ext.size() &&
            name.compare(name.size() - ext.size(), ext.size(), ext) == 0) {
            results.push_back(entry);
        }
    }
    return results;
}

bool JPAK::GetFile(const std::string &path, char **buffer, int *size) {
    if (!buffer || !size) {
        std::cerr << "GetFile: null output parameter" << std::endl;
        return false;
    }

    if (!ready) {
        std::cerr << "GetFile: JPAK not loaded" << std::endl;
        return false;
    }

    std::vector<std::string> paths = split(path, '/');

    if (paths.empty()) {
        std::cerr << "GetFile: empty path" << std::endl;
        return false;
    }

    if (paths[0].empty()) {
        paths.erase(paths.begin());
    }

    if (paths.empty()) {
        std::cerr << "GetFile: root request not supported" << std::endl;
        return false;
    }

    Json::Value fileentry = FindFileEntry(paths, root);
    if (fileentry == JPAK_NOT_FOUND_DATA) {
        std::cerr << "File not found: " << path << std::endl;
        return false;
    }

    if (!fileentry.isMember("offset") || !fileentry.isMember("size")) {
        std::cerr << "GetFile: file entry missing offset or size" << std::endl;
        return false;
    }

    int fileOffset = fileentry["offset"].asInt();
    int fileSize   = fileentry["size"].asInt();

    if (fileOffset < 0 || fileSize <= 0 || fileSize > 256 * 1024 * 1024) {
        std::cerr << "GetFile: invalid offset/size: "
                  << fileOffset << "/" << fileSize << std::endl;
        return false;
    }

    if (fileOffset > fileSize_ || fileSize > fileSize_ - fileOffset) {
        std::cerr << "GetFile: file range exceeds package bounds: "
                  << fileOffset << "+" << fileSize << " > " << fileSize_ << std::endl;
        return false;
    }

    if (fileOffset + fileSize > static_cast<int>(tableOffset_)) {
        std::cerr << "GetFile: file range overlaps table: "
                  << fileOffset << "+" << fileSize << " > " << tableOffset_ << std::endl;
        return false;
    }

    jpakfile.clear();
    jpakfile.seekg(fileOffset, std::ios::beg);
    if (!jpakfile.good()) {
        std::cerr << "GetFile: seek to file data failed" << std::endl;
        return false;
    }

    *buffer = new char[fileSize];
    jpakfile.read(*buffer, fileSize);
    if (!jpakfile.good()) {
        std::cerr << "GetFile: read of file data failed" << std::endl;
        delete[] *buffer;
        *buffer = nullptr;
        return false;
    }

    *size = fileSize;
    return true;
}

bool JPAK::GetFile(const char *path, char **buf, int *size) {
    if (!path) {
        std::cerr << "GetFile: null path" << std::endl;
        return false;
    }
    return GetFile(std::string(path), buf, size);
}
