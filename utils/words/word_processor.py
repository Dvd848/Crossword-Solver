import re
import shutil
import subprocess
import json

from collections import defaultdict, Counter
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

final_form_mapping = {
    translate_mapping["ך"]: translate_mapping["כ"],
    translate_mapping["ם"]: translate_mapping["מ"],
    translate_mapping["ן"]: translate_mapping["נ"],
    translate_mapping["ף"]: translate_mapping["פ"],
    translate_mapping["ץ"]: translate_mapping["צ"]
}

def init():
    try:
        shutil.rmtree(str(OUTPUT_DIR))
    except FileNotFoundError:
        pass
    OUTPUT_DIR.mkdir(parents = True, exist_ok = True)

def anagram_encoder(s: str) -> str:
    s = s.translate(s.maketrans("".join(final_form_mapping.keys()), "".join(final_form_mapping.values())))
    counter = Counter(s)
    sorted_items = sorted(counter.items())
    
    return "".join(f"{char}{count}" for char, count in sorted_items if char.isalpha())

def process_words_to_text():
    for source in INPUT_DIR.glob(f"{INPUT_PREFIX}*.txt"):

        print(f"Processing {source}")

        identifier = source.stem.replace(INPUT_PREFIX, "")

        output_path = OUTPUT_DIR / identifier
        output_path.mkdir()

        #
        # Dictionary
        #

        words_mapping = defaultdict(list)
        words_mapping_translated = defaultdict(list)
        words_mapping_full = defaultdict(list)
        num_words = 0

        with open(source, "r", encoding = "utf8") as f:
            for line in f:
                line = line.rstrip()
                bucket = len(line) - line.count("'")
                words_mapping[bucket].append(line)
                words_mapping_translated[bucket].append(TRANSLATE_CHARS.sub(lambda m: translate_mapping.get(m.group(1), 
                                                                                                            m.group(1)), 
                                                                                                            line))
                num_words += 1

        for mapping, prefix in [(words_mapping, "h"), (words_mapping_translated, "e")]:
            for length, words in mapping.items():
                words_mapping_full[prefix].extend(words)
                with open(output_path / f"dictionary_{prefix}{length}.txt", "w", encoding = "utf8") as o:
                    o.write("\n".join(sorted(words)))

        with open(output_path / f"related_e0.txt", "w", encoding = "utf8") as o:
            o.write("\n".join(sorted(words_mapping_full["e"])))
            

        #
        # Anagrams
        #

        full_anagram_mapping = defaultdict(lambda: defaultdict(list))
        for length, words in words_mapping_translated.items():
            for word in sorted(words):
                encoding = anagram_encoder(word)
                clean_length = sum([int(x) for x in re.split(r"[a-zA-Z]", encoding) if x != ""])
                full_anagram_mapping[clean_length][encoding].append(word)

        for length, words in full_anagram_mapping.items():
            with open(output_path / f"anagram_e{length}.json", "w", encoding = "utf8") as o:
                o.write(json.dumps(words))
        license_path = INPUT_DIR / f"license_{identifier}.txt"
        if license_path.exists():
            shutil.copyfile(license_path, output_path / "LICENSE")
        
        print(f"Processed {num_words} words")

def process_words_to_dawg():
    print("Creating DAWGs")

    container_name = "crossword_solver"

    try:
        subprocess.run(f"docker build -t {container_name} .", 
                        shell=True, check=True, capture_output=True, cwd=INPUT_DIR)
    except subprocess.CalledProcessError as e:
        raise RuntimeError("Failed to build docker container") from e


    subcommand = "/bin/bash -c ./dawg_encode.sh"
    command = f'docker run -it --rm --mount type=bind,source="{INPUT_DIR}",target=/app ' \
              f'--mount type=bind,source="{OUTPUT_DIR}",target=/words {container_name} {subcommand}' 
              
    try:
        output = subprocess.run(command, shell=True, check=True, capture_output=True, cwd=INPUT_DIR)
    except subprocess.CalledProcessError as e:
        raise RuntimeError("Failed to encode DAWG") from e
    print("Done creating DAWGs")

def create_config():
    print("Creating configuration")
    with open(OUTPUT_DIR / "config.json", "w", encoding="utf8") as o:
        config = {}
        config["translate_mapping"] = translate_mapping
        config["final_form_mapping"] = final_form_mapping
        config["list_source"] = {}

        #
        # Dictionary
        #

        dict_source = {}
        for directory in OUTPUT_DIR.iterdir():
            if not directory.is_dir():
                continue
            current_dict_source = {}
            for txt_file in Path(directory).glob("dictionary_e*.txt"):
                word_length = int(txt_file.stem.replace("dictionary_e", ""))
                txt_size = txt_file.stat().st_size
                dawg_size = Path(txt_file.with_suffix(".dawg")).stat().st_size
                current_dict_source[word_length] = "txt" if txt_size <= dawg_size else "dawg"

            max_key = max(current_dict_source.keys())
            dict_source[directory.name] = [""] * (max_key + 1)
            for k, v in current_dict_source.items():
                dict_source[directory.name][k] = v
        
        config["list_source"]["dictionary"] = dict_source

        #
        # Anagrams
        #

        anagram_source = {}
        for directory in OUTPUT_DIR.iterdir():
            if not directory.is_dir():
                continue
            current_anagram_source = {}
            for json_file in Path(directory).glob("anagram_e*.json"):
                word_length = int(json_file.stem.replace("anagram_e", ""))
                current_anagram_source[word_length] = "json"

            max_key = max(current_anagram_source.keys())
            anagram_source[directory.name] = [""] * (max_key + 1)
            for k, v in current_anagram_source.items():
                anagram_source[directory.name][k] = v
        
        config["list_source"]["anagram"] = anagram_source

        # 
        # Related expressions
        #

        related_source = {}
        for name in dict_source.keys():
            txt_file = OUTPUT_DIR / name / f"related_e0.txt"
            txt_size = txt_file.stat().st_size
            dawg_file = txt_file.with_suffix(".dawg")
            dawg_size = dawg_file.stat().st_size if dawg_file.exists() else float('inf')
            related_source[name] = {0: "txt" if txt_size <= dawg_size else "dawg"}
        config["list_source"]["related"] = related_source
            
        o.write(json.dumps(config, indent=4))
    print("Done creating configuration")

def main():
    init()
    process_words_to_text()
    process_words_to_dawg()
    create_config()


if __name__ == "__main__":
    main()