import { getWords, dictSources, CsIllegalTemplateError, getApostropheChars } from './CrosswordSolver.js';

/*
############################################################################################
# Helper functions to process long tasks in chunks (without freezing UI)                   #
# Based on https://stackoverflow.com/questions/38735201/                                   #
############################################################################################
*/

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

async function processWork(array, start, end, workCallback, doneCallback) {
    const iterationsPerChunk = 10000;
    const limit = Math.min(array.length, end);
    for (let i = start; i < limit; i++) {
        if (i && i % iterationsPerChunk === 0) {
            await pause();
        }
        workCallback(array[i]);
    }
    doneCallback();
}

/*
############################################################################################
# Main logic                                                                               #
############################################################################################
*/

class CsUiError extends Error {
    constructor(type, title, message, options) {
        super(message, options);
        this.type = type;
        this.title = title;
    }
}

export function init() {
    setupForm();
    setupDictSources();
    document.getElementById("template").focus();
    console.log("Initialization complete");
};

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

async function showWordsChunk(words, start, wordList, loader, wordListWrapper, submitButton) {
    const WORDS_PER_CHUNK = 500;
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);

    const scrollTop = document.documentElement.scrollTop;

    await processWork(words, start, end, function(word){
        // Executed for each word:
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(word));
        wordList.appendChild(li);
    }, 
    function() {
        // Executed when done:

        if (start == 0) {
            loader.style.display = "none";
            wordListWrapper.appendChild(wordList);
            wordList.style.display = "block";
            wordListWrapper.style.display = "block";
            submitButton.disabled = false; 
        }

        let more = document.getElementById("more_button");
        if (more != null) {
            more.remove();
        }

        if (end != words.length) {
            const hr = document.createElement("hr");
            wordList.appendChild(hr);
            more = document.createElement("button");
            more.appendChild(document.createTextNode(`הציגו עוד ${words.length - end} תוצאות »`));
            more.onclick = async function(){await showWordsChunk(words, end, wordList, loader, wordListWrapper, submitButton)};
            more.classList.add("btn", "btn-dark");
            more.id = "more_button";
            wordListWrapper.appendChild(more);
        }

        // Deal with weird Chrome bug
        window.scrollTo({
            top: scrollTop,
            behavior: 'instant'
        });
    });
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

    wordListWrapper.style.display = "none";
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

        await showWordsChunk(words, 0, wordList, loader, wordListWrapper, submitButton);
    } catch (e) {
        loader.style.display = "none";

        if (e instanceof CsUiError) {
            showAlert(e.type, e.title, e.message);
        } else if (e instanceof CsIllegalTemplateError) {
            let message = "עבור מקור זה ניתן להשתמש אך ורק בתווים הבאים:</br>";
            message += "<ul>";
            message += "<li>אותיות בעברית</li>";
            message += `<li>גרש (במידה והוא מופיע לאחר ${getApostropheChars().join(" / ")})</li>`;
            message += "<li>סימן שאלה (לסימון תו לא ידוע)</li>";
            if (e.allowSpaces)
            {
                message += "<li>רווחים</li>";
            }
            message += "</ul>";

            showAlert("error", "שגיאה: תבנית לא חוקית!", message);
        } else {
            showAlert("error", "שגיאה פנימית!", "מעניין מה קרה שם...");
        }

        console.log(e.message);
        submitButton.disabled = false; 
    }
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
