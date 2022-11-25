FROM ubuntu:latest

RUN \
    apt-get update \
 && apt-get install -y perl hspell wget tar \
 && wget http://hspell.ivrix.org.il/hspell-1.4.tar.gz \
 && tar -xvf hspell-1.4.tar.gz \
 && rm -rf /var/lib/apt/lists/* 
 
RUN \
    cd hspell-1.4 \
 && perl wolig.pl | iconv -f ISO-8859-8 -t UTF-8 > /tmp/wolig.txt \
 && ./woo | iconv -f ISO-8859-8 -t UTF-8 > /tmp/woo.txt 

WORKDIR /app


# docker build -t hspell .
# docker run -it --mount type=bind,source="${PWD}",target=/app hspell /bin/bash