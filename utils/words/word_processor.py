import re
import shutil
import subprocess
import json

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

def init():
    try:
        shutil.rmtree(str(OUTPUT_DIR))
    except FileNotFoundError:
        pass
    OUTPUT_DIR.mkdir(parents = True, exist_ok = True)

def process_words_to_text():
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
                words_mapping_translated[bucket].append(TRANSLATE_CHARS.sub(lambda m: translate_mapping.get(m.group(1), 
                                                                                                            m.group(1)), 
                                                                                                            line))
                num_words += 1

        for mapping, prefix in [(words_mapping, "h"), (words_mapping_translated, "e")]:
            for length, words in mapping.items():
                with open(output_path / f"{prefix}{length}.txt", "w", encoding = "utf8") as o:
                    o.write("\n".join(sorted(words)))

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

        list_source = {}
        for directory in OUTPUT_DIR.iterdir():
            if not directory.is_dir():
                continue
            current_list_source = {}
            for txt_file in Path(directory).glob("e*.txt"):
                word_length = int(txt_file.stem.replace("e", ""))
                txt_size = txt_file.stat().st_size
                dawg_size = Path(txt_file.with_suffix(".dawg")).stat().st_size
                current_list_source[word_length] = "txt" if txt_size <= dawg_size else "dawg"

            max_key = max(current_list_source.keys())
            list_source[directory.name] = [""] * (max_key + 1)
            for k, v in current_list_source.items():
                list_source[directory.name][k] = v
        
        config["list_source"] = list_source
            
        o.write(json.dumps(config, indent=4))
    print("Done creating configuration")

def main():
    init()
    process_words_to_text()
    process_words_to_dawg()
    create_config()


if __name__ == "__main__":
    main()