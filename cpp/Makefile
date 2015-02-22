all:  jpak

jpak:
	g++ -std=c++11 -fPIC -shared JPAK.cpp -lcurl -ljson -o libjpak.so
	
clean:
	rm -fr libjpak.so