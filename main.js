import { get_words } from './modules/CrosswordSolver.js';

async function show_words() {
    const template = document.getElementById("template").value;
    const words_ul = document.getElementById("words");

    words_ul.innerHTML = "";

    const words = await get_words(template);
    for (const word of words) {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(word));
        words_ul.appendChild(li);
    }

    return false;
}

document.getElementById("word_form").onsubmit = async function(event) {
    event.preventDefault();
    await show_words();
};