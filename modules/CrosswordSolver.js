
const context = {
    initialized: false,
    TEMPLATE_CHARS: /(\?|[\u0590-\u05fe]'?)/g,

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

    double_char_mapping: {}
}

function init_module() {
    if (context.initialized) {
        return;
    }

    for (const [key, value] of Object.entries(context.translate_mapping)) {
        context.reverse_translate_mapping[value] = key;
        if (key.length > 1) {
            context.double_char_mapping[key[0]] = key;
        }
    }

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
    if (!(source in context.words)) {
        context.words[source] = {};
    }

    if (!(length in context.words[source])) {
        console.log(`Loading database for word length ${length}`);
        const response = await fetch(`words/out/${source}/e${length}.txt`);
        if (!response.ok) {
            const message = `An error has occurred: ${response.status}`;
            throw new Error(message);
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

function construct_regex(template) {
    const options = Array.from(Array(get_word_length(template)), () => new Array(0))

    let i = 0;
    for (const match of template.matchAll(context.TEMPLATE_CHARS)) {
        let char = match[0];
        if (char == "?") {
            char = ".";
        }
        options[i].push(char);
        if (char in context.double_char_mapping) {
            options[i].push(context.double_char_mapping[char]);
        }

        i += 1;
    }

    const regex_combinations = cartesian(...options)
    const res = regex_combinations.map(x => heb2eng(x.join(""))).join("|");

    return res;
}

export async function get_words(source, template) {
    init_module();
    const word_length = get_word_length(template);
    const words = await load_wordlist(source, word_length);
    const regex = construct_regex(template);

    const result = words.matchAll(regex);
    return Array.from(result, ([word]) => eng2heb(word)).sort();

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