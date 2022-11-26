import re

EXCLUDE_CHARS = re.compile(r"([^א-ת']|(?<![גזצתץ])')")

def has_excluded_characters(string):
    return not EXCLUDE_CHARS.search(string)