# Crossword-Solver Word-List Creation

These scripts are used in order to generate the word-lists for the application.

They result in the creation of three sources:
 * *Wiktionary* and *Hebrew Wordnet* are merged into the "dictionary" source
 * *Hspell* is stored in the "Hspell" source
 * *Wikipedia* is stored in the "encyclopedia" source

## Prerequisites

 * Install [Docker](https://www.docker.com/)
    * With some minor modifications the scripts can be altered to run natively though.
 * Download the raw word lists from their original sources
    * [Wiktionary](https://dumps.wikimedia.org/hewiktionary/latest/hewiktionary-latest-all-titles.gz)
    * [Wikipedia](https://dumps.wikimedia.org/hewiki/latest/hewiki-latest-all-titles-in-ns0.gz)
    * [Hebrew Wordnet](http://cl.haifa.ac.il/projects/mwn/HWN.tar.gz)
    * [Hspell](https://github.com/LibreOffice/dictionaries/blob/master/he_IL/he_IL.dic)
       * Alternatively the script can be modified to use the raw results produced by Hspell. 
         They can be found in the Docker container under `/tmp`.
 * Extract the raw word-lists and place them where the script expects them.
    * See the expected location at the top of each `parse_*.py` file.

## Word-list Creation

1. Run `parser.py` to parse each raw word-list, remove illegal words, merge results and create a clean word-list for each source.
2. Run `word_processor.py` to process the output of step #1, create a database of words for each word length and compress the lists as DAWGs. 
   This also creates the `config.json` file for the application.

## Ignore List

The parser already has basic rules to skip illegal entries 
(e.g. entries that have double-quotes in them, representing acronyms).
Unfortunately some illegal words don't match any of the predefined rules and should
still be excluded from the dictionary. In such a case, they can be added to the *Ignore List* maintained under `ignore_list.txt`.