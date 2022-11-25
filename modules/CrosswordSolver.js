
const context = {
    initialized: false,
    HEB_CHARS: /(\?|[\u0590-\u05fe]'?)/g,

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

    reverse_translate_mapping: {}
}

function init_module() {
    for (const [key, value] of Object.entries(context.translate_mapping)) {
        context.reverse_translate_mapping[value] = key;
    }
}

async function load_wordlist(length) {
    if (!(length in context.words)) {
        console.log(`Loading database for word length ${length}`);
        const response = await fetch(`words/out/e${length}.txt`);
        if (!response.ok) {
            const message = `An error has occurred: ${response.status}`;
            throw new Error(message);
        }
        const words = await response.text();
        context.words[length] = words;
    }

    return context.words[length];
}

function get_word_length(word) {
    return (word.match(context.HEB_CHARS) || []).length;
}

function heb2eng(word) {
    return word.replace(context.HEB_CHARS, m => context.translate_mapping[m]);
}

function eng2heb(word) {
    return word.replace(/[a-zA-Z]/g, m => context.reverse_translate_mapping[m]);
}

function construct_regex(template) {
    template = template.replaceAll("?", ".");
    return heb2eng(template);
}

export async function get_words(template) {
    init_module();
    const word_length = get_word_length(template);
    const words = await load_wordlist(word_length);
    const regex = construct_regex(template);

    const result = words.matchAll(regex);
    return Array.from(result, ([word]) => eng2heb(word));

}
