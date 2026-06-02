CXX      ?= g++
CXXFLAGS ?= -std=c++11 -fPIC -Wall -Wextra -Wpedantic
CXXFLAGS += -Ijsoncpp/include -Ijsoncpp/src/lib_json
DEPFLAGS  = -MMD -MP

LDFLAGS  ?=

TARGET   = libjpak.so
SRC      = JPAK.cpp
JSONSRC  = jsoncpp/src/lib_json/json_reader.cpp \
           jsoncpp/src/lib_json/json_value.cpp \
           jsoncpp/src/lib_json/json_writer.cpp
OBJS     = $(SRC:.cpp=.o) $(JSONSRC:.cpp=.o)
DEPS     = $(OBJS:.o=.d)

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -shared $^ -o $@

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(DEPFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(DEPS) $(TARGET)

-include $(DEPS)
