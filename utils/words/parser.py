from pathlib import Path

import parse_hspell
import parse_wikidict
import parse_wikipedia
import parse_wordnet

BASE_PATH = Path(__file__).parent

def generate_general_terms():
    words = set()
    words.update(parse_wikipedia.extract_words())

    with open(BASE_PATH / "words_encyclopedia.txt", "w", encoding="utf8") as o:
        o.write("\n".join(words))
    with open(BASE_PATH / "license_encyclopedia.txt", "w", encoding="utf8") as o:
        o.write("The terms from this dictionary were retrieved from the following open-source repositories:\n")
        o.write(" - Wikipedia\n")
        o.write(f"\n{'=' * 80}\n\n")
        o.write("License text for Wikipedia:\n")
        o.write(parse_wikidict.LICENSE)
        o.write(f"\n\n{'=' * 80}\n\n")

def generate_dict_words():
    words = set()
    words.update(parse_wikidict.extract_words())
    words.update(parse_wordnet.extract_words())

    with open(BASE_PATH / "words_dictionary.txt", "w", encoding="utf8") as o:
        o.write("\n".join(words))

    with open(BASE_PATH / "license_dictionary.txt", "w", encoding="utf8") as o:
        o.write("The words from this dictionary were retrieved from the following open-source dictionaries:\n")
        o.write(" - Wiktionary\n")
        o.write(" - Hebrew Wordnet\n")
        o.write(f"\n{'=' * 80}\n\n")
        o.write("License text for Wiktionary:\n")
        o.write(parse_wikidict.LICENSE)
        o.write(f"\n\n{'=' * 80}\n\n")
        o.write("License text for Hebrew Wordnet:\n")
        o.write(parse_wordnet.LICENSE)
        o.write(f"\n\n{'=' * 80}\n\n")


def generate_spellcheck_words():
    words = set()
    words.update(parse_hspell.extract_words())

    with open(BASE_PATH / "words_hspell.txt", "w", encoding="utf8") as o:
        o.write("\n".join(words))

    with open(BASE_PATH / "license_hspell.txt", "w", encoding="utf8") as o:
        o.write(parse_hspell.LICENSE)


def main():
    generate_dict_words()
    generate_spellcheck_words()
    generate_general_terms()

if __name__ == "__main__":
    main()