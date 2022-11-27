import re
from pathlib import Path

EXCLUDE_CHARS = re.compile(r"([^א-ת']|(?<![גזצתץ])')")

ignore_list = set()

with open(Path(__file__).parent / "ignore_list.txt", "r", encoding="utf8") as f:
    ignore_list.update(f.read().split())

print(ignore_list)

def is_ignored(word):
    return word in ignore_list

def has_excluded_characters(string):
    return EXCLUDE_CHARS.search(string)


