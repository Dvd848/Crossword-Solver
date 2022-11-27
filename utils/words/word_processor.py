import re
import shutil
import os

from collections import defaultdict
from pathlib import Path

INPUT_DIR = Path(__file__).parent
INPUT_PREFIX = "words_"
OUTPUT_DIR = Path(__file__).parent / ".." / ".." / "wordlists"

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
    shutil.rmtree(str(OUTPUT_DIR))
except FileNotFoundError:
    pass
OUTPUT_DIR.mkdir(parents = True, exist_ok = True)

for source in INPUT_DIR.glob(f"{INPUT_PREFIX}*.txt"):

    print(f"Processing {source}")

    identifier = source.stem.replace(INPUT_PREFIX, "")

    output_path = OUTPUT_DIR / identifier
    output_path.mkdir()

    words_mapping = defaultdict(list)
    words_mapping_translated = defaultdict(list)
    num_words = 0

    with open(source, "r", encoding = "utf8") as f:
        for line in f:
            line = line.rstrip()
            bucket = len(line) - line.count("'")
            words_mapping[bucket].append(line)
            words_mapping_translated[bucket].append(TRANSLATE_CHARS.sub(lambda m: translate_mapping.get(m.group(1), m.group(1)), line))
            num_words += 1

    for mapping, prefix in [(words_mapping, "h"), (words_mapping_translated, "e")]:
        for length, words in mapping.items():
            with open(output_path / f"{prefix}{length}.txt", "w", encoding = "utf8") as o:
                o.write("\n".join(sorted(words)))

    license_path = INPUT_DIR / f"license_{identifier}.txt"
    if license_path.exists():
        shutil.copyfile(license_path, output_path / "LICENSE")
    
    print(f"Processed {num_words} words")