all:  jpak

jpak:
	g++ -Ijsoncpp/includes/json/ -std=c++11 -fPIC -shared JPAK.cpp -lcurl -ljsoncpp -o libjpak.so

clean:
	rm -fr libjpak.so
