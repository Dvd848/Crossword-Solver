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
        workCallback(i, array[i]);
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
    const context = {};
    setupForm(context);
    setupDictSources(context);
    setupCategory(context);
    setupControls(context);
    document.getElementById("template").focus();
    console.log("Initialization complete");
};

function setupForm(context) {
    document.getElementById("word_form").onsubmit = async function(event) {
        event.preventDefault();
        await showWords(context);
    
        return false;
    };
}

function setupControls(context) {
    document.addEventListener("keydown", function (event) {
        let link = null;
        let delta = 0;
        if (event.key === "F4") {
            event.preventDefault();

            if (event.shiftKey) {
                delta = -1;
            } else {
                delta = 1;
            }

            link = document.querySelector(`a[data-link_index="${context.click_index + delta}"]`);
            if (link) {
                link.click();
            }            
        }
    });    
}

function setupDictSources(context) {
    const dictSourceWrapper = document.getElementById("checkbox_wrapper");

    for (const [code, source] of Object.entries(dictSources)) {
        const div = document.createElement("div");
        div.className = "form-check form-check-inline";
        
        const input = document.createElement("input");
        input.className = "form-check-input";
        input.type = "checkbox";
        input.id = `sourceCheckbox_${code}`;
        input.name = "sources";
        input.value = code;
        input.checked = true;
        
        const label = document.createElement("label");
        label.className = "form-check-label";
        label.htmlFor = input.id;
        label.textContent = source.name;
        
        div.appendChild(input);
        div.appendChild(label);
        dictSourceWrapper.appendChild(div);
    }
}

function setupCategory(context) {
    const select = document.getElementById("category");
    select.addEventListener('change', function showOnChange(evt) {
        const value = evt.target.value;

      
        const visibility = (value == "dictionary") ? "visible" : "hidden";
        document.getElementById("template_help").style.visibility = visibility;
    });
    select.dispatchEvent(new Event('change'));
}

async function showWordsChunk(context, words, start, wordList) {
    const WORDS_PER_CHUNK = 500;
    const MAX_WINDOW_WIDTH_FOR_IFRAME = 1100;
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);

    const scrollTop = document.documentElement.scrollTop;
    
    const iframe = document.getElementById('wiki-frame');
    const submitButton = document.getElementById("submit");
    const wordListWrapper = document.getElementById("word_wrapper");
    const iframeWrapper = document.getElementById("iframe_wrapper");
    const loader = document.getElementById("loader");
    let showIframe = false;

    await processWork(words, start, end, function(index, wordItem){      
        // Executed for each word:

        const word = wordItem.word;
        let url = "";
        if (dictSources[wordItem.source].homepage != null)
        {
            showIframe = true;
            const urlTemplate = dictSources[wordItem.source].homepage + dictSources[wordItem.source].searchQuery;
            url = urlTemplate.replace("###QUERY###", encodeURIComponent(word));
        }

        let li = document.createElement("li");
        let link = document.createElement("a");
        link.appendChild(document.createTextNode(word));
        if (url != "")
        {
            link.dataset.link_index = ++context.link_count;
            link.setAttribute("href", url);
            link.setAttribute("target", "_BLANK");
            link.addEventListener('click', function(event) {
                context.click_index = parseInt(link.dataset.link_index);
                if (window.innerWidth > MAX_WINDOW_WIDTH_FOR_IFRAME) {
                    event.preventDefault();
                    
                    iframe.src = url;
                    iframeWrapper.style.display = "block";
                } else {
                    iframeWrapper.style.display = "none";
                }
            });
        }
        li.appendChild(link);
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
            iframe.src = /*dictSources[dictSource].homepage ||*/ "about:blank";
            showIframe = (showIframe) && (window.innerWidth > MAX_WINDOW_WIDTH_FOR_IFRAME);
            iframeWrapper.style.display = showIframe ? "block" : "none";
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
            more.onclick = async function(){await showWordsChunk(context, words, end, wordList)};
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

async function showWords(context) {
    const wordTemplate = document.getElementById("template").value.trim();
    const submitButton = document.getElementById("submit");
    const wordListWrapper = document.getElementById("word_wrapper");
    const iframeWrapper = document.getElementById("iframe_wrapper");
    const loader = document.getElementById("loader");
    let wordList = document.getElementById("words");

    if (wordTemplate.length == 0) {
        return;
    }

    context.click_index = 0;
    context.link_count = 0;
    
    submitButton.disabled = true; 

    if (wordList != null) {
        wordList.remove();
    }

    wordListWrapper.style.display = "none";
    iframeWrapper.style.display = "none";
    loader.style.display = "block";
    wordList = document.createElement("ol");
    wordList.id = "words";
    hideAlert();
    
    try {
        let wordsFinal = [];

        const allWords = new Set();
        let numIllegalTemplateErrors = 0;
        let spacesAllowed = false;
        let questionMarksAllowed = false;

        const checkedValues = [];
        document.querySelectorAll('input[name="sources"]:checked').forEach(checkbox => {
            checkedValues.push(checkbox.value);
        });

        if (checkedValues.length == 0) {
            let message = "<p style='text-align: center'>";
            message += "חובה לבחור לפחות מקור אחד 🙁";
            message += "<br/>";
            message += "אחרת איפה נחפש?";
            message += "</p>";
            throw new CsUiError("warning", "אופס...", message);
        }
        
        for (const code of checkedValues) {
            try {
                console.log(`Searching for '${wordTemplate}' in ${code}`);

                const wordsTemp = await getWords(code, wordTemplate, 
                                                 document.getElementById("category").value);
                wordsTemp.forEach(item => {
                    if (!allWords.has(item)) {
                        allWords.add(item)
                        wordsFinal.push({word: item, source: code});
                    }
                });
            } catch (e) {
                console.log(e);
                if (e instanceof CsIllegalTemplateError) {
                    numIllegalTemplateErrors++;
                    spacesAllowed = spacesAllowed || e.allowSpaces;
                    questionMarksAllowed = questionMarksAllowed || e.allowQuestionMarks;
                }
            }
        }

        if (numIllegalTemplateErrors == checkedValues.length) {
            throw new CsIllegalTemplateError("", {}, spacesAllowed, questionMarksAllowed);
        }

        if (wordsFinal.length == 0) {
            let message = "<p style='text-align: center'>";
            message += "לא מצאנו אף מילה שמתאימה לתבנית הזו 🙁";
            message += "<br/>";
            if (document.querySelectorAll('input[name="sources"]:not(:checked)').length > 0) {
                message += "נסו אולי מקור אחר?";
            }
            message += "</p>";
            throw new CsUiError("warning", "אופס...", message);
        }

        wordsFinal.sort((a, b) => a.word.localeCompare(b.word));
        await showWordsChunk(context, wordsFinal, 0, wordList);

    } catch (e) {
        loader.style.display = "none";

        if (e instanceof CsUiError) {
            showAlert(e.type, e.title, e.message);
        } else if (e instanceof CsIllegalTemplateError) {
            let message = "עבור מקור זה ניתן להשתמש אך ורק בתווים הבאים:</br>";
            message += "<ul>";
            message += "<li>אותיות בעברית</li>";
            message += `<li>גרש (במידה והוא מופיע לאחר ${getApostropheChars().join(" / ")})</li>`;
            if (e.allowQuestionMarks)
            {
                message += "<li>סימן שאלה (לסימון תו לא ידוע)</li>";
            }

            if (e.allowSpaces)
            {
                message += "<li>רווחים</li>";
            }
            message += "</ul>";

            showAlert("error", "שגיאה: תבנית לא חוקית!", message);
        } else {
            showAlert("error", "שגיאה פנימית!", "מעניין מה קרה שם...");
        }

        console.log(e);
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
