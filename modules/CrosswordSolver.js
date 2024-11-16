import { CompletionDAWG } from './dawg/dawgs.js';

/*
High Level Overview of the Module
---------------------------------
This module is responsible for providing a list of words which match a given template.
A templates is a string composed of characters and question marks (which act as wildcards). 
Results that match the template are valid words (in the sense that they appear in some 
predefined dictionary) where each of the explicit characters appear in the same location 
as in the template.
For example, a template of "?o" will produce a list of words including "go", "no", "so",
"to" and any other two-letter word that ends with an 'O'.

In its core, the template matching mechanism is based on regular expressions. To match
a template of "?a??h" we can use a regular expression such as ".a..h". However, there
is one complication given that this module is aimed for Hebrew word matching: Some
letters in Hebrew can be followed by an apostrophe, altering their sound. For example,
the letter "צ" sounds like "tz", but followed by an apostrophe ("צ'") it sounds like "ch".
Users might be looking for a template such as "צ?" but would also like to find words that
are written as "צ'?". In both cases, matching words would be considered two letter words.
A regex for all two letter words would be "..", but it wouldn't match a two-letter word 
starting with "צ'" (which is essentially composed of three characters).
To overcome this without over-complicating the regular expression, all Hebrew are saved in
the database "encoded" in Latin characters. Apostrophe-letters are encoded with one character
for the version without the apostrophe, and a different character for the version with the 
apostrophe. Therefore a simple regular expression such as ".." will find both results, and 
the translation to Hebrew happens afterwards.

Note that if the user explicitly enters a character that has an apostrophe in the template
(e.g. "ג'?"), the module will only return result that start with the apostrophe-version of 
the letter (e.g. "ג'ק"). Alternatively, if the user enters a character that can have an
apostrophe but doesn't in the template (e.g. "ג?"), both results will be returned.
This is achieved by producing the cartesian product of all possible characters for each location.
For example, if "ג" is encoded to "g" and "ג'" is encoded to "j", the regular expression will
become "(g.|j.)".


The regular expression filtering is performed on the client side, so there is value in reducing
the amount of data to perform the filtering on. Since all results for a given template will 
always contain the same amount of letters (apostrophe letters count as one in this context),
it was chosen to divide the dictionary into several files, each containing words of the same
length. For a given template, only the file containing words of the same length are retrieved
(and cached) by the application. Encoding the words in Latin characters already reduces the file
size significantly (the 7 character dictionary for Hspell weights 1.7MB in its original Hebrew form 
and 970KB encoded with Latin characters). To further reduce the network overhead, word lists are also
compressed to DAWGs (Direct Acyclic Word Graphs) which are efficient data structures to store words.
During dictionary creation time, the size of the raw Latin-encoded word-list is compared to the size
of the matching DAWG, and the type that is smaller is selected as the database for a given length.
For short lists, the overhead of a DAWG data structure might make the file larger than its raw form,
but for longer lists the compression rate is significant (the 7 character dictionary for Hspell gets
reduced to 170KB as a DAWG).

*/

/**
 * Global context for the module.
 */
const context = {
    // True iff the module has been initialized
    initialized: false, 

    // Regular expression to iterate the characters of the template.
    // A character followed by an apostrophe is considered one character.
    TEMPLATE_CHARS: /(\?|[\u0590-\u05fe]'?| )/g,

    // Regex to determine if the given template is legal.
    // Populated in runtime based on the translateMapping.
    LEGAL_TEMPLATE: undefined,

    // Cache for wordlists. 
    // Structure is: words[source][word_length] = <list of words>.
    words: {},

    // A mapping of how to encode Hebrew characters with Latin characters (Hebrew -> Latin).
    translateMapping: null,

    // A reverse mapping of how to decode Latin characters to Hebrew (Latin -> Hebrew).
    reverseTranslateMapping: {},

    // A mapping of word length to database type for each given source.
    // Structure is: listSource[source] = [<DB type for length 0>..<DB type for length n>]
    // Available database types: "txt" for text, "dawg" for DAWG, "" for no DB.
    listSource: null,

    // Mapping of characters that can come with an apostrophe to the version with the apostrophe.
    apostropheMapping: {}
}

/**
 * Custom Crossword-Solver exception.
 */
export class CsError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}

/**
 * Custom Crossword-Solver exception for an illegal template.
 */
export class CsIllegalTemplateError extends CsError {
    constructor(message, options, allowSpaces) {
        super(message, options);
        this.allowSpaces = allowSpaces;
    }
}

/**
 * Initializes the module if it wasn't previously initialized.
 * Reads the configuration from the server and populates different
 * members of the global context.
 * @returns {void}
 */
async function initModule() {
    if (context.initialized) {
        return;
    }

    const response = await fetch(`wordlists/config.json`);
    const config = await response.json();
    context.translateMapping = config["translate_mapping"];
    context.listSource = config["list_source"];

    context.dictAttributes = {};

    for (let source of dictSources){
        context.dictAttributes[source.code] = {
            "allowSpaces": source.allowSpaces
        }
    }

    const apostropheChars = []
    for (const [key, value] of Object.entries(context.translateMapping)) {
        context.reverseTranslateMapping[value] = key;
        if (key.length > 1) {
            context.apostropheMapping[key[0]] = key;
            apostropheChars.push(key);
        }
    }

    context.LEGAL_TEMPLATE = RegExp(`^([\u0590-\u05fe ]|${apostropheChars.join("|")}|\\?)+$`, 'g')

    context.initialized = true;
}


/**
 * Compute the cartesian product for the given input.
 * Source: https://stackoverflow.com/questions/15298912/
 * @param  {...any} args The different groups (arrays) to perform the cartesian product for
 * @returns {Array<Array<any>} Array representing the cartesian product
 */
function cartesian(...args) {
    var r = [], max = args.length-1;
    function helper(arr, i) {
        for (var j=0, l=args[i].length; j<l; j++) {
            var a = arr.slice(0); // clone arr
            a.push(args[i][j]);
            if (i==max)
                r.push(a);
            else
                helper(a, i+1);
        }
    }
    helper([], 0);
    return r;
}

/**
 * Given a source and length, return the database type for the matching dictionary.
 * 
 * @param {string} source The source for the requested database (see dictSources)
 * @param {number} length The word length for the requested database.
 * @returns {string} "txt" for a text database, "dawg" for a DAWG database and "" if there is no database.
 */
function getDbType(source, length) {
    if (!(source in context.listSource)) {
        return "";
    }

    if (length >= context.listSource[source].length) {
        return "";
    }

    return context.listSource[source][length];
}

/**
 * Loads and returns the appropriate word-list for the given source and length.
 * Caches the result for future queries.
 * @param {string} source The source for the requested database (see dictSources)
 * @param {number} length The word length for the requested database.
 * @returns {string} The word-list for the requested parameters, or "" if no such word-list exists.
 */
async function loadWordlist(source, length) {
    if (length <= 0) {
        throw new CsError(`Illegal length: ${length}`);
    }

    if (!(source in context.words)) {
        context.words[source] = {};
    }

    if (!(length in context.words[source])) {
        // Not in cache

        const dbType = getDbType(source, length);
        if (dbType == "") {
            console.log(`Can't find ${dbType} database for word length ${length}`);
            return "";
        }

        console.log(`Loading ${dbType} database for word length ${length}`);

        const response = await fetch(`wordlists/${source}/e${length}.${dbType}`);
        if (!response.ok) {
            if (response.status == 404) {
                console.log(`Can't find database for word length ${length}`);
                return "";
            }
            throw new CsError(`An error has occurred: ${response.status}`);
        }

        let words = null;
        if (dbType == "txt") {
            words = await response.text();
        }
        else if (dbType == "dawg") {
            const wordsBin = await response.arrayBuffer();
            const dawg = new CompletionDAWG();
            
            // Extract the DAWG before returning it
            let startTime = performance.now();
            dawg.load(wordsBin);
            let endTime = performance.now();
            console.log(`Loaded DAWG database in ${endTime - startTime} milliseconds`)

            startTime = performance.now();
            words = dawg.keys().join("\n");
            endTime = performance.now();
            console.log(`Extracted DAWG database in ${endTime - startTime} milliseconds`)
        }
        else {
            throw new CsError(`Unknown DB type: ${dbType}`);
        }
        context.words[source][length] = words;
    }

    return context.words[source][length];
}

/**
 * Return the word length for a given word.
 * Characters with an apostrophe are counted as one character.
 * @param {string} word The word to calculate the length for.
 * @returns {number} The length of the word.
 */
function getWordLength(word) {
    return (word.match(context.TEMPLATE_CHARS) || []).length;
}

/**
 * Encode a Hebrew string with Latin characters.
 * @param {string} word The word to encode.
 * @returns {string} The encoded version of the word.
 */
function heb2eng(word) {
    return word.replace(context.TEMPLATE_CHARS, m => context.translateMapping[m]);
}

/**
 * Decode a Latin-encoded word back to the Hebrew representation.
 * @param {string} word The word to decode.
 * @returns {string} The decoded word.
 */
function eng2heb(word) {
    let res = word.replace(/[a-zA-Z]/g, m => context.reverseTranslateMapping[m]);
    return res.replace(/_/g, " ");
}

/**
 * Checks whether a given template is legal.
 * @param {string} template The template to test.
 * @param {boolean} allowSpaces Are spaces allowed?
 * @returns {boolean} True iff the template is legal.
 */
function isLegalTemplate(template, allowSpaces) {
    if (!template.match(context.LEGAL_TEMPLATE)) {
        return false;
    }

    if ( (!allowSpaces) && (template.includes(" ")) ) {
        return false;
    }

    return true;
}

/**
 * Constructs a regular expression to search for based on the given template.
 * 
 * Logic:
 *  - Question marks are replaced with a character wildcard (".")
 *  - Non-apostrophe characters and characters with an explicit apostrophe 
 *    are replaced with their latin encoding
 *  - Characters which can have an apostrophe (but don't in the template) split 
 *    the template into one version with the apostrophe and one without
 * @param {string} template The template to use for constructing the regular expression.
 * @returns {string} A regular expression string representing the template.
 */
function constructSearchRegex(template) {
    const options = Array.from(Array(getWordLength(template)), () => new Array(0))

    let i = 0;
    for (const match of template.matchAll(context.TEMPLATE_CHARS)) {
        let char = match[0];
        if (char == "?") {
            char = "[a-zA-Z]";
        }
        else if (char == " ") {
            char = "_";
        }
        options[i].push(char);
        if (char in context.apostropheMapping) {
            options[i].push(context.apostropheMapping[char]);
        }

        i += 1;
    }

    const regexCombinations = cartesian(...options)
    const res = regexCombinations.map(x => heb2eng(x.join(""))).join("|");

    return res;
}

/**
 * Retrieve the list of words matching the given template for the given source.
 * @param {string} source The source for the requested database (see dictSources)
 * @param {string} template The template to search for.
 * @returns {Array<string>} Array of matching words.
 */
export async function getWords(source, template) {
    await initModule();
    if (!isLegalTemplate(template, context.dictAttributes[source].allowSpaces)) {
        throw new CsIllegalTemplateError(`Illegal template: '${template}'`, 
                                         {}, 
                                         context.dictAttributes[source].allowSpaces);
    }
    const wordLength = getWordLength(template);
    const words = await loadWordlist(source, wordLength);
    const regex = constructSearchRegex(template);

    const result = words.matchAll(regex);
    return Array.from(result, ([word]) => eng2heb(word)).sort();
}

/**
 * Return characters which can have an apostrophe.
 * @returns {Array<string>} An array of characters that can have an apostrophe.
 */
export function getApostropheChars() {
    return Object.keys(context.apostropheMapping);
}

/**
 * Mapping of available dictionaries.
 */
export const dictSources = [
    {
        "name": "מילון (ויקימילון + Hebrew Wordnet)",
        "code": "dictionary",
        "allowSpaces": false,
    },
    {
        "name": "בודק איות (Hspell)",
        "code": "hspell",
        "allowSpaces": false,
    },
    {
        "name": "אנציקלופדיה (ויקיפדיה)",
        "code": "encyclopedia",
        "allowSpaces": true
    }
]