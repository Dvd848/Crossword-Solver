from pathlib import Path
from parse_common import *

# Source: https://github.com/LibreOffice/dictionaries/blob/master/he_IL/he_IL.dic

INPUT_PATH = Path(__file__).parent / "he_IL.dic" 

def extract_words():
    res = set()
    print("Extracting words for Hspell")
    with open(INPUT_PATH, "r", encoding = "utf8") as f:
        for line in f:
            if "/" not in line:
                print(f"Skipping {line.rstrip()}")
                continue
            line = line.rstrip().split("/")[0]
            if has_excluded_characters(line) or len(line) == 1  or is_ignored(line):
                print(f"Skipping {line}")
                continue
            res.add(line)
    return res


LICENSE = """
This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.

This Hebrew dictionary was generated from data prepared by the Hspell project:

        http://hspell.ivrix.org.il/

Hspell version 1.4 was used.

Hspell is copyright:
 2000-2017 Nadav Har'El <nyh@math.technion.ac.il>
 2000-2017 Dan Kenigsberg <danken@cs.technion.ac.il>
"""
