
const context = {
    words: {}
}

async function load_wordlist(length) {
    if (!(length in context.words)) {
        console.log(`Loading database for word length ${length}`);
        const response = await fetch(`words/out/h${length}.txt`);
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
    return (word.match(/(\?|[\u0590-\u05fe]'?)/g) || []).length;
}

function construct_regex(template) {
    return template.replaceAll("?", ".")
}

export async function get_words(template) {
    const word_length = get_word_length(template);
    const words = await load_wordlist(word_length);
    const regex = construct_regex(template);

    const result = words.matchAll(regex);

    return [...result];
}
