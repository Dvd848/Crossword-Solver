
const context = {
    initialized: false,

    TEMPLATE_CHARS: /(\?|[\u0590-\u05fe]'?)/g,
    LEGAL_TEMPLATE: undefined,

    words: {},

    // TODO: Share with word_processor.py
    translate_mapping: {
        "א": "a", "ב": "b", "ג": "g", "ג'": "j", "ד": "d", "ה": "h", 
        "ו": "v", "ז": "z", "ז'": "Z", "ח": "H", "ט": "T", "י": "y", 
        "כ": "c", "ך": "C", "ל": "l", "מ": "m", "ם": "M", "נ": "n", 
        "ן": "N", "ס": "s", "ע": "e", "פ": "p", "ף": "P", "צ": "w", 
        "צ'": "W", "ץ": "x", "ץ'": "X", "ק": "k", "ר": "r", "ש": "S", 
        "ת": "t", "ת'": "q"
    },

    reverse_translate_mapping: {},

    apostrophe_mapping: {}
}

export class CsError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}

export class CsIllegalTemplateError extends CsError {
    constructor(message, options) {
        super(message, options);
    }
}

function init_module() {
    if (context.initialized) {
        return;
    }

    const apostrophe_chars = []
    for (const [key, value] of Object.entries(context.translate_mapping)) {
        context.reverse_translate_mapping[value] = key;
        if (key.length > 1) {
            context.apostrophe_mapping[key[0]] = key;
            apostrophe_chars.push(key);
        }
    }

    context.LEGAL_TEMPLATE = RegExp(`^([\u0590-\u05fe]|${apostrophe_chars.join("|")}|\\?)+$`, 'g')

    context.initialized = true;
}

// https://stackoverflow.com/questions/15298912/
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

async function load_wordlist(source, length) {
    if (length <= 0) {
        throw new CsError(`Illegal length: ${length}`);
    }

    if (!(source in context.words)) {
        context.words[source] = {};
    }

    if (!(length in context.words[source])) {
        console.log(`Loading database for word length ${length}`);
        const response = await fetch(`words/out/${source}/e${length}.txt`);
        if (!response.ok) {
            if (response.status == 404) {
                console.log(`Can't find database for word length ${length}`);
                return "";
            }
            throw new CsError(`An error has occurred: ${response.status}`);
        }
        const words = await response.text();
        context.words[source][length] = words;
    }

    return context.words[source][length];
}

function get_word_length(word) {
    return (word.match(context.TEMPLATE_CHARS) || []).length;
}

function heb2eng(word) {
    return word.replace(context.TEMPLATE_CHARS, m => context.translate_mapping[m]);
}

function eng2heb(word) {
    return word.replace(/[a-zA-Z]/g, m => context.reverse_translate_mapping[m]);
}

function is_legel_template(template) {
    return template.match(context.LEGAL_TEMPLATE);
}

function construct_regex(template) {
    const options = Array.from(Array(get_word_length(template)), () => new Array(0))

    let i = 0;
    for (const match of template.matchAll(context.TEMPLATE_CHARS)) {
        let char = match[0];
        if (char == "?") {
            char = ".";
        }
        options[i].push(char);
        if (char in context.apostrophe_mapping) {
            options[i].push(context.apostrophe_mapping[char]);
        }

        i += 1;
    }

    const regex_combinations = cartesian(...options)
    const res = regex_combinations.map(x => heb2eng(x.join(""))).join("|");

    return res;
}

export async function get_words(source, template) {
    init_module();
    if (!is_legel_template(template)) {
        throw new CsIllegalTemplateError(`Illegal template: '${template}'`);
    }
    const word_length = get_word_length(template);
    const words = await load_wordlist(source, word_length);
    const regex = construct_regex(template);

    const result = words.matchAll(regex);
    return Array.from(result, ([word]) => eng2heb(word)).sort();

}

export function get_apostrophe_chars() {
    return Object.keys(context.apostrophe_mapping);
}

export const sources = [
    {
        "name": "ויקימילון",
        "code": "wikidict"
    },
    {
        "name": "פרויקט Hspell (בודק איות)",
        "code": "hspell"
    }
]