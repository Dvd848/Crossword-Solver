import re
import shutil

from collections import defaultdict
from pathlib import Path

INPUT_PATH = r"he_IL.dic" # https://github.com/LibreOffice/dictionaries/blob/master/he_IL/he_IL.dic
OUT_PATH = r"out"

EXCLUDE_CHARS = re.compile(r"([^\u0590-\u05fe']|(?<![גזצתץ])')")

out_dir = Path(OUT_PATH)
shutil.rmtree(str(out_dir))
out_dir.mkdir(parents = True, exist_ok = True)

def has_excluded_characters(string):
    return not EXCLUDE_CHARS.search(string)

words_mapping = defaultdict(list)

with open(INPUT_PATH, "r", encoding = "utf8") as f:
    for line in f:
        line = line.rstrip().split("/")[0]
        if not has_excluded_characters(line) or len(line) == 1:
            print(f"Skipping {line}")
            continue
        words_mapping[len(line) - line.count("'")].append(line)


for length, words in words_mapping.items():
    with open(out_dir / f"h{length}.txt", "w", encoding = "utf8") as o:
        o.write("\n".join(sorted(words)))



