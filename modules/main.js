import { getWords, dictSources, CsIllegalTemplateError, getApostropheChars } from './CrosswordSolver.js';
import { CompletionDAWG } from './dawg/dawgs.js';

class CsUiError extends Error {
    constructor(type, title, message, options) {
        super(message, options);
        this.type = type;
        this.title = title;
    }
}

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

async function processWork(array, workCallback, doneCallback) {
    const iterationsPerChunk = 10000;
    for (let i = 0; i < array.length; i++) {
        if (i && i % iterationsPerChunk === 0) {
            await pause();
        }
        workCallback(array[i]);
    }
    doneCallback();
}

function toggleAlert(type, title, message, show) {
    const alertElem = document.getElementById("alert_div");
    let cssAlert = "";

    switch (type) {
        case "warning":
            cssAlert = "alert-warning";
            break;
        case "error":
        default:
            cssAlert = "alert-danger";
            break;
    }
    
    if (show) {
        document.getElementById("alert_title").innerText = title;
        document.getElementById("alert_message").innerHTML = message;
        alertElem.classList.remove("alert-warning");
        alertElem.classList.remove("alert-danger");
        alertElem.classList.add(cssAlert);

        alertElem.classList.remove("d-none");
        alertElem.classList.add("show");
    }
    else {
        alertElem.classList.remove("show");
        alertElem.classList.add("d-none");
    }
}

function showAlert(type, title, message) {
    toggleAlert(type, title, message, true);
}

function hideAlert() {
    toggleAlert("", "", "", false);
}

async function showWords() {
    const wordTemplate = document.getElementById("template").value.trim();
    const dictSource = document.getElementById("sources").value;
    const submitButton = document.getElementById("submit");
    const wordListWrapper = document.getElementById("word_wrapper");
    const loader = document.getElementById("loader");
    let wordList = document.getElementById("words");

    if (wordTemplate.length == 0) {
        return;
    }
    
    submitButton.disabled = true; 

    if (wordList != null) {
        wordList.remove();
    }

    loader.style.display = "block";
    wordList = document.createElement("ol");
    wordList.id = "words";
    hideAlert();

    console.log(`Searching for '${wordTemplate}' in ${dictSource}`);
    
    try {
        const words = await getWords(dictSource, wordTemplate);
        if (words.length == 0) {
            let message = "<p style='text-align: center'>";
            message += "לא מצאנו אף מילה שמתאימה לתבנית הזו 🙁";
            message += "<br/>";
            message += "נסו אולי מקור אחר?";
            message += "</p>";
            throw new CsUiError("warning", "אופס...", message);
        }

        await processWork(words, function(word){
            // Executed for each word:
            let li = document.createElement("li");
            li.appendChild(document.createTextNode(word));
            wordList.appendChild(li);
        }, 
        function() {
            // Executed when done:
            loader.style.display = "none";
            wordListWrapper.appendChild(wordList);
            wordList.style.display = "block";
            submitButton.disabled = false; 
        });
    } catch (e) {
        loader.style.display = "none";

        if (e instanceof CsUiError) {
            showAlert(e.type, e.title, e.message);
        } else if (e instanceof CsIllegalTemplateError) {
            let message = "ניתן להשתמש אך ורק בתווים הבאים:</br>";
            message += "<ul>";
            message += "<li>אותיות בעברית</li>";
            message += `<li>גרש (במידה והוא מופיע לאחר ${getApostropheChars().join(" / ")})</li>`;
            message += "<li>סימן שאלה (לסימון תו לא ידוע)</li>";
            message += "</ul>";

            showAlert("error", "שגיאה: תבנית לא חוקית!", message);
        } else {
            showAlert("error", "שגיאה פנימית!", "מעניין מה קרה שם...");
        }

        console.log(e.message);
        submitButton.disabled = false; 
    }
}

function setupForm() {
    document.getElementById("word_form").onsubmit = async function(event) {
        event.preventDefault();
        await showWords();
    
        return false;
    };
}

function setupDictSources() {
    const dictSourceSelect = document.getElementById("sources");
    for (let source of dictSources){
        const opt = document.createElement('option');
        opt.value = source.code;
        opt.innerText = source.name;
        dictSourceSelect.appendChild(opt);
    }
}

export function init() {
    setupForm();
    setupDictSources();
    document.getElementById("template").focus();
    console.log("Initialization complete");
};

/*
export async function test() {
    console.log("test");
    const response = await fetch(`wordlists/dictionary/e2.dawg`);
    const wordsBin = await response.arrayBuffer();
    const dawg = new CompletionDAWG();
    console.log("loading dawg");
    dawg.load(wordsBin);
    console.log("printing keys");
    console.log(dawg.keys("a"))
    console.log(dawg.keys(""))
    console.log("done");
}
*/