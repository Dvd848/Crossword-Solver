import { get_words } from './modules/CrosswordSolver.js';

// https://stackoverflow.com/questions/38735201/
const pause = (function () {
    let reqId = 0;
    const reqs = new Map();

    window.addEventListener('message', (e) => {
        const resolve = reqs.get(e.data);
        if (resolve) {
            reqs.delete(e.data);
            resolve();
        }
    });

    return _ => new Promise(resolve => {
        const id = reqId++;
        reqs.set(id, resolve);
        window.postMessage(id);
    });
})();

async function process_work(array, callback) {
    const iterationsPerChunk = 10000;
    for (let i = 0; i < array.length; i++) {
        if (i && i % iterationsPerChunk === 0) {
            await pause();
        }
        callback(array[i]);
    }
}

async function show_words() {
    const template = document.getElementById("template").value;
    const words_ul = document.getElementById("words");

    words_ul.innerHTML = "";

    const words = await get_words(template);
    await process_work(words, function(word){
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(word));
        words_ul.appendChild(li);
    })

    return false;
}

document.getElementById("word_form").onsubmit = async function(event) {
    event.preventDefault();
    await show_words();
};