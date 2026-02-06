#!/bin/bash

find /words -type f -iname "related_e*.txt" -exec bash -c 'dawgdic-build -g "$1" > "${1%.txt}.dawg"' _ {} \;
find /words -type f -iname "dictionary_e*.txt" -exec bash -c 'dawgdic-build -g "$1" > "${1%.txt}.dawg"' _ {} \;