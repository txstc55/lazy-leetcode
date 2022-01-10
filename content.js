// content js is strictly for rendering the page
// change the page element
// and sending message to background, which is background.js
// or receiving messages from popup and background

// because we matched the url, we will send the message to background
// telling him to show our extension available
chrome.runtime.sendMessage({ todo: "showPageAction" });
language_map = {
    "c++": "cpp",
    "c": "c-3",
    "java": "java",
    "python": "python",
    "python3": "python3",
    "c#": "c-2",
    "javascript": "javascript",
    "ruby": "ruby",
    "swift": "swift",
    "go": "go",
    "scala": "scala",
    "kotlin": "kotlin",
    "rust": "rust",
    "php": "php",
    "typescript": "typescript",
    "racket": "racket",
    "erlang": "erlang",
    "elixir": "elixir",
} // in case the name doesn't match

function requestAnswer() {
    // we just need the full question name, then send a post request to get the true id of the question
    var language = document.getElementsByClassName("ant-select-selection-selected-value")[0].textContent;
    console.log("Using:", language);
    var title = document.getElementsByClassName("css-v3d350")[0].textContent;
    question_name_full = title.split(". ")[1];
    chrome.runtime.sendMessage({ todo: "fetchAnswer", language: language_map[language.toLowerCase()], question_name_full: question_name_full.toLowerCase() });
}

// this is a function that sets the button 
function setButtonWithFunction() {
    const timer = setInterval(() => {
        // everything needs to be done only after page is rendered
        const submit_code_button = document.getElementsByClassName("submit__2ISl")[0];
        // put the button there only if we have not put it there
        if ($("#cheatButton").length == 0) {
            if (submit_code_button) {
                clearTimeout(timer);
                // get the button's parent node
                let parent = submit_code_button.parentNode;
                // create the button and append it to the div
                var $input = $('<input type="button" value="Show Me Answer" id="cheatButton"/>');
                $input.prependTo(parent);
                // now add the click function
                // when we click, we want to:
                // 1. get the language right now
                // 2. send a message to background with the language info
                // 3. get the question id to send post request
                $("#cheatButton").click(requestAnswer);
            }
        }
    }, 150);
}


// a floating div for showing the solution, normally hidden
const solutionDiv = document.createElement('div');
solutionDiv.setAttribute('style', 'white-space: pre; border: 5px; background-color: rgba(15, 18, 23, 1); color: white; padding: 8px; position: absolute;');
solutionDiv.style.visibility = "hidden";
solutionDiv.style.left = 0 + 'px';
solutionDiv.style.right = "";
solutionDiv.style.top = 0 + 'px';
solutionDiv.style.visibility = "hidden";
solutionDiv.id = "solutionDiv";
document.body.appendChild(solutionDiv);

// text div before code
const solutionDivText = document.createElement('h4');
solutionDivText.innerText = "Here you go, a solution";
solutionDivText.setAttribute('style', 'color: white;');
solutionDiv.appendChild(solutionDivText);

// containing code, we will change the innerhtml
const codeDiv = document.createElement('div');
codeDiv.setAttribute('style', 'overflow-y: scroll; overflow-x: scroll');
solutionDiv.appendChild(codeDiv);

// another one button
var anotherOne = document.createElement('input');
anotherOne.type = "button";
anotherOne.value = "Another One";
anotherOne.id = "anotherOne";
anotherOne.addEventListener("click", requestAnswer);
anotherOne.setAttribute('style', 'color: black; float: left')
solutionDiv.appendChild(anotherOne);

// close div button
var closeDiv = document.createElement('input');
closeDiv.type = "button";
closeDiv.value = "Close";
closeDiv.id = "closeDiv";
closeDiv.addEventListener("click", () => { solutionDiv.style.visibility = "hidden" });
closeDiv.setAttribute('style', 'color: black; float: right')
solutionDiv.appendChild(closeDiv);


// we want to listen to message sending here
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Content received message:", request)
    if (request.todo == "addButton") {
        // if the message sent is to add the button
        // because of a page change
        // then add the button
        setButtonWithFunction();
    } else if (request.todo == "pasteSolution") {
        if (request.success) {
            codeDiv.innerHTML = request.solution;
            // highlight the code
            document.querySelectorAll('pre code').forEach((el) => {
                hljs.highlightElement(el);
            });
            solutionDiv.style.visibility = "visible";
            // now place the div
            var rect = document.getElementsByClassName("CodeMirror-scroll")[0].getBoundingClientRect();
            solutionDiv.style.left = rect.left + "px";
            solutionDiv.style.top = ((rect.top + rect.bottom) / 2) + "px";
            codeDiv.style.height = (Math.floor((rect.bottom - rect.top) * 0.4)) + "px";
            codeDiv.style.width = (Math.floor((rect.right - rect.left) * 0.8)) + "px";
        }
    } else if (request.todo == "hideSolutionDiv") {
        // hide this when go to another question or page transfer
        solutionDiv.style.visibility = "hidden"
    }
});

setButtonWithFunction()

// let submit_code_button = document.getElementsByClassName("submit__2ISl")[0];
// console.log(submit_code_button)