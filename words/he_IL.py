import re
import shutil

from collections import defaultdict
from pathlib import Path

INPUT_PATH = Path(__file__).parent / "he_IL.dic" # https://github.com/LibreOffice/dictionaries/blob/master/he_IL/he_IL.dic
OUTPUT_PATH = Path(__file__).parent / "words.txt"

EXCLUDE_CHARS = re.compile(r"([^\u0590-\u05fe']|(?<![גזצתץ])')")

def has_excluded_characters(string):
    return not EXCLUDE_CHARS.search(string)

with open(INPUT_PATH, "r", encoding = "utf8") as f, open(OUTPUT_PATH, "w", encoding = "utf8") as o:
    for line in f:
        if "/" not in line:
            print(f"Skipping {line.rstrip()}")
            continue
        line = line.rstrip().split("/")[0]
        if not has_excluded_characters(line) or len(line) == 1:
            print(f"Skipping {line}")
            continue
        bucket = len(line) - line.count("'")
        o.write(f"{line}\n")
