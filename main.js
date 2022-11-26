import { get_words, sources } from './modules/CrosswordSolver.js';

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

async function process_work(array, work_callback, done_callback) {
    const iterationsPerChunk = 10000;
    for (let i = 0; i < array.length; i++) {
        if (i && i % iterationsPerChunk === 0) {
            await pause();
        }
        work_callback(array[i]);
    }
    done_callback();
}

async function show_words() {
    const template = document.getElementById("template").value;
    const words_list = document.getElementById("words");
    const source = document.getElementById("sources").value;
    const button = document.getElementById("submit")
    
    button.disabled = true; 
    words_list.style.display = "none";
    words_list.innerHTML = "";

    console.log(`Searching for '${template}' in ${source}`);

    const words = await get_words(source, template);
    await process_work(words, function(word){
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(word));
        words_list.appendChild(li);
    }, 
    function() {
        words_list.style.display = "block";
        button.disabled = false; 
    });
}

function setup_form() {
    document.getElementById("word_form").onsubmit = async function(event) {
        event.preventDefault();
        await show_words();
    
        return false;
    };
}

function setup_sources() {
    const select = document.getElementById("sources");
    for (let source of sources){
        const opt = document.createElement('option');
        opt.value = source.code;
        opt.innerText = source.name;
        select.appendChild(opt);
    }
}

export function init() {
    setup_form();
    setup_sources();
    document.getElementById("template").focus();
};