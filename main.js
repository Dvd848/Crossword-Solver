import { get_words, sources, CsIllegalTemplateError, get_apostrophe_chars } from './modules/CrosswordSolver.js';

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

function toggle_alert(type, title, message, show) {
    const alert_elem = document.getElementById("alert_div");
    let css_alert = "";

    switch (type) {
        case "warning":
            css_alert = "alert-warning";
            break;
        case "error":
        default:
            css_alert = "alert-danger";
            break;
    }
    
    if (show) {
        document.getElementById("alert_title").innerText = title;
        document.getElementById("alert_message").innerHTML = message;
        alert_elem.classList.remove("alert-warning");
        alert_elem.classList.remove("alert-danger");
        alert_elem.classList.add(css_alert);

        alert_elem.classList.remove("d-none");
        alert_elem.classList.add("show");
    }
    else {
        alert_elem.classList.remove("show");
        alert_elem.classList.add("d-none");
    }
}

function show_alert(type, title, message) {
    toggle_alert(type, title, message, true);
}

function hide_alert() {
    toggle_alert("", "", "", false);
}

async function show_words() {
    const template = document.getElementById("template").value.trim();
    const words_list = document.getElementById("words");
    const source = document.getElementById("sources").value;
    const button = document.getElementById("submit");

    if (template.length == 0) {
        return;
    }
    
    button.disabled = true; 
    words_list.style.display = "none";
    hide_alert();
    words_list.innerHTML = "";

    console.log(`Searching for '${template}' in ${source}`);
    
    try {
        const words = await get_words(source, template);
        if (words.length == 0) {
            throw new CsUiError("warning", "אופס...", "לא מצאנו אף מילה שמתאימה לתבנית הזו 🙁");
        }

        await process_work(words, function(word){
            let li = document.createElement("li");
            li.appendChild(document.createTextNode(word));
            words_list.appendChild(li);
        }, 
        function() {
            words_list.style.display = "block";
            button.disabled = false; 
        });
    } catch (e) {
        if (e instanceof CsUiError) {
            show_alert(e.type, e.title, e.message);
        } else if (e instanceof CsIllegalTemplateError) {
            let message = "ניתן להשתמש אך ורק בתווים הבאים:</br>";
            message += "<ul>";
            message += "<li>אותיות בעברית</li>";
            message += `<li>גרש (במידה והוא מופיע לאחר ${get_apostrophe_chars().join(" / ")})</li>`;
            message += "<li>סימן שאלה (לסימון תו לא ידוע)</li>";
            message += "</ul>";

            show_alert("error", "שגיאה: תבנית לא חוקית!", message);
        } else {
            show_alert("error", "שגיאה פנימית!", "מעניין מה קרה שם...");
        }

        console.log(e.message);
        button.disabled = false; 
    }
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