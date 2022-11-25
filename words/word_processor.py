import re
import shutil

from collections import defaultdict
from pathlib import Path

INPUT_PATH = Path(__file__).parent / "words.txt"
OUT_PATH = Path(__file__).parent / "out"

TRANSLATE_CHARS = re.compile(r"([\u0590-\u05fe]'?)")

translate_mapping = {
    "א": "a", "ב": "b", "ג": "g", "ג'": "j", "ד": "d", "ה": "h", 
    "ו": "v", "ז": "z", "ז'": "Z", "ח": "H", "ט": "T", "י": "y", 
    "כ": "c", "ך": "C", "ל": "l", "מ": "m", "ם": "M", "נ": "n", 
    "ן": "N", "ס": "s", "ע": "e", "פ": "p", "ף": "P", "צ": "w", 
    "צ'": "W", "ץ": "x", "ץ'": "X", "ק": "k", "ר": "r", "ש": "S", 
    "ת": "t", "ת'": "q"
}

try:
    shutil.rmtree(str(OUT_PATH))
except FileNotFoundError:
    pass
OUT_PATH.mkdir(parents = True, exist_ok = True)

words_mapping = defaultdict(list)
words_mapping_translated = defaultdict(list)

with open(INPUT_PATH, "r", encoding = "utf8") as f:
    for line in f:
        line = line.rstrip()
        bucket = len(line) - line.count("'")
        words_mapping[bucket].append(line)
        words_mapping_translated[bucket].append(TRANSLATE_CHARS.sub(lambda m: translate_mapping.get(m.group(1), m.group(1)), line))

for mapping, prefix in [(words_mapping, "h"), (words_mapping_translated, "e")]:
    for length, words in mapping.items():
        with open(OUT_PATH / f"{prefix}{length}.txt", "w", encoding = "utf8") as o:
            o.write("\n".join(sorted(words)))
    
