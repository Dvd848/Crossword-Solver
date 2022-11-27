import re

EXCLUDE_CHARS = re.compile(r"([^א-ת']|(?<![גזצתץ])')")

def has_excluded_characters(string):
    return EXCLUDE_CHARS.search(string)