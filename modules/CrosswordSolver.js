
const context = {
    initialized: false,

    TEMPLATE_CHARS: /(\?|[\u0590-\u05fe]'?)/g,
    LEGAL_TEMPLATE: undefined,

    words: {},

    // TODO: Share with word_processor.py
    translateMapping: {
        "א": "a", "ב": "b", "ג": "g", "ג'": "j", "ד": "d", "ה": "h", 
        "ו": "v", "ז": "z", "ז'": "Z", "ח": "H", "ט": "T", "י": "y", 
        "כ": "c", "ך": "C", "ל": "l", "מ": "m", "ם": "M", "נ": "n", 
        "ן": "N", "ס": "s", "ע": "e", "פ": "p", "ף": "P", "צ": "w", 
        "צ'": "W", "ץ": "x", "ץ'": "X", "ק": "k", "ר": "r", "ש": "S", 
        "ת": "t", "ת'": "q"
    },

    reverseTranslateMapping: {},

    apostropheMapping: {}
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

function initModule() {
    if (context.initialized) {
        return;
    }

    const apostropheChars = []
    for (const [key, value] of Object.entries(context.translateMapping)) {
        context.reverseTranslateMapping[value] = key;
        if (key.length > 1) {
            context.apostropheMapping[key[0]] = key;
            apostropheChars.push(key);
        }
    }

    context.LEGAL_TEMPLATE = RegExp(`^([\u0590-\u05fe]|${apostropheChars.join("|")}|\\?)+$`, 'g')

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

async function loadWordlist(source, length) {
    if (length <= 0) {
        throw new CsError(`Illegal length: ${length}`);
    }

    if (!(source in context.words)) {
        context.words[source] = {};
    }

    if (!(length in context.words[source])) {
        console.log(`Loading database for word length ${length}`);
        const response = await fetch(`wordlists/${source}/e${length}.txt`);
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

function getWordLength(word) {
    return (word.match(context.TEMPLATE_CHARS) || []).length;
}

function heb2eng(word) {
    return word.replace(context.TEMPLATE_CHARS, m => context.translateMapping[m]);
}

function eng2heb(word) {
    return word.replace(/[a-zA-Z]/g, m => context.reverseTranslateMapping[m]);
}

function isLegelTemplate(template) {
    return template.match(context.LEGAL_TEMPLATE);
}

function constructSearchRegex(template) {
    const options = Array.from(Array(getWordLength(template)), () => new Array(0))

    let i = 0;
    for (const match of template.matchAll(context.TEMPLATE_CHARS)) {
        let char = match[0];
        if (char == "?") {
            char = ".";
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

export async function getWords(source, template) {
    initModule();
    if (!isLegelTemplate(template)) {
        throw new CsIllegalTemplateError(`Illegal template: '${template}'`);
    }
    const wordLength = getWordLength(template);
    const words = await loadWordlist(source, wordLength);
    const regex = constructSearchRegex(template);

    const result = words.matchAll(regex);
    return Array.from(result, ([word]) => eng2heb(word)).sort();

}

export function getApostropheChars() {
    return Object.keys(context.apostropheMapping);
}

export const dictSources = [
    {
        "name": "ויקימילון",
        "code": "wikidict"
    },
    {
        "name": "פרויקט Hspell (בודק איות)",
        "code": "hspell"
    }
]