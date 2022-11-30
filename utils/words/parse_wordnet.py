import xml.etree.ElementTree as ET
from pathlib import Path
from parse_common import *

# Source: http://cl.haifa.ac.il/projects/mwn/HWN.tar.gz

INPUT_PATH = Path(__file__).parent / "hebrew_synonyms.xml" 

def remove_niqqud_from_string(my_string):
    return ''.join(['' if  1456 <= ord(c) <= 1479 else c for c in my_string])

def extract_words():
    res = set()
    with open(INPUT_PATH, "r", encoding = "utf8") as f:
        root = ET.fromstring(f.read())
        for name in ["lemma", "undotted", "dotted_without_dots"]:
            for node in root.findall(f'.//{name}'):
                word = remove_niqqud_from_string(node.text)
                word = word.strip("\n!")
                if  (has_excluded_characters(word)) or is_ignored(word) or (len(word) == 1):
                    print(f"Skipping {word}")
                    continue
                res.add(word)
    return res

LICENSE = """
Copyright: 2007 Noam Ordan and Shuly Wintner.

Hebrew Wordnet

This software and database is being provided to you, the LICENSEE, by
the University of Haifa under the following license.  By obtaining,
using and/or copying this software and database, you agree that you
have read, understood, and will comply with these terms and
conditions:

 Permission to use, copy, modify and distribute this software and
 database and its documentation for any purpose and without fee or
 royalty is hereby granted, provided that you agree to comply with
 the following copyright notice and statements, including the
 disclaimer, and that the same appear on ALL copies of the software,
 database and documentation, including modifications that you make
 for internal use or for distribution.

Hebrew WordNet Copyright 2007 by Noam Ordan and Shuly Wintner.  All rights
reserved.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND the University of Haifa MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, the University of Haifa MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

The name of the University of Haifa may not be used in advertising or
publicity pertaining to distribution of the software and/or database.
Title to copyright in this software, database and any associated
documentation shall at all times remain with University of Haifa and
LICENSEE agrees to preserve same.


http://cl.haifa.ac.il/projects/mwn/index.shtml
"""
