from collections import defaultdict
from pathlib import Path
from common import *

INPUT_PATH = Path(__file__).parent / "hewiktionary-latest-all-titles.txt" # https://dumps.wikimedia.org/hewiktionary/latest/
OUTPUT_PATH = Path(__file__).parent / "words_wikidict.txt"

with open(INPUT_PATH, "r", encoding = "utf8") as f, open(OUTPUT_PATH, "w", encoding = "utf8") as o:
    for line in f:
        if not line.startswith("0"):
            print(f"Skipping {line.rstrip()}")
            continue
        line = line.rstrip().split()[1]
        if not ( (has_excluded_characters(line)) or (len(line) == 1) or (len(line) == 2 and line[-1] == "'") ):
            print(f"Skipping {line}")
            continue
        o.write(f"{line}\n")
