import re
from pathlib import Path

EXCLUDE_CHARS_BASE = "([^א-ת'{}]|(?<![גזצתץ])')"
EXCLUDE_CHARS_DISALLOW_SPACES = re.compile(EXCLUDE_CHARS_BASE.format(""))
EXCLUDE_CHARS_ALLOW_SPACES = re.compile(EXCLUDE_CHARS_BASE.format("_"))

ignore_list = set()

with open(Path(__file__).parent / "ignore_list.txt", "r", encoding="utf8") as f:
    ignore_list.update(f.read().split())

def is_ignored(word):
    return word in ignore_list

def has_excluded_characters(string, allow_spaces = False):
    if allow_spaces:
        return EXCLUDE_CHARS_ALLOW_SPACES.search(string)
    else:
        return EXCLUDE_CHARS_DISALLOW_SPACES.search(string)


