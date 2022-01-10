var matched_tab_id = new Set(); // only operate when the tab id matches
var discuss_post_url = {}; // store the post id which can easily be converted to url
var discuss_post_selection = {}; // which post to look at now

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("Message Request: ", request);
    if (request.todo == "showPageAction") {
        // show that our extension is activated
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.pageAction.show(tabs[0].id);
            matched_tab_id.add(tabs[0].id);
            console.log("Tab id set:", matched_tab_id);
        });
    } else if (request.todo == "fetchAnswer") {
        // fetch the answer for this question
        // we will need the current url
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
            let url = tabs[0].url;
            var question_name = url.split("/").at(-2);
            // check if we already has this item question in list
            if (question_name in discuss_post_url) {
                // check if this specific language is accessed before
                if (request.language in discuss_post_url[question_name]) {
                    // we have accessed this before, now just give the next solution
                    return_code_result(question_name, request.language);
                } else {
                    console.log("Accessing again:", question_name, ", with language:", request.language)
                    // we have not accessed this language before
                    // start a new http request
                    var data = JSON.stringify({
                        "operationName": "questionTopicsList",
                        "variables": {
                            "orderBy": "most_votes",
                            "query": "",
                            "first": 10,
                            "tags": [
                                request.language
                            ],
                            "questionId": request.questionId
                        },
                        "query": "query questionTopicsList($questionId: String!, $orderBy: TopicSortingOption, $query: String, $first: Int!, $tags: [String!]) {\n  questionTopicsList(questionId: $questionId, orderBy: $orderBy, query: $query, first: $first, tags: $tags) {\n    ...TopicsList\n    __typename\n  }\n}\n\nfragment TopicsList on TopicConnection {\n  totalNum\n  edges {\n    node {\n      id\n      }}}"
                    });
                    var xhr = new XMLHttpRequest();
                    xhr.withCredentials = true;
                    xhr.addEventListener("readystatechange", function () {
                        if (this.readyState === 4 && this.status == 200) {
                            discuss_post_url[question_name][request.language] = [];
                            discuss_post_selection[question_name][request.language] = 0;
                            let nodes = this.response.data.questionTopicsList.edges;
                            // push the post ids to a list for accessing
                            for (var i = 0; i < nodes.length; i++) {
                                discuss_post_url[question_name][request.language].push(nodes[i].node.id);
                            }
                            console.log("Post ids:", discuss_post_url[question_name][request.language])
                            return_code_result(question_name, request.language);
                        }
                    });
                    xhr.open("POST", "https://leetcode.com/graphql");
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.responseType = 'json';
                    xhr.send(data);
                }
            } else {
                console.log("First access:", question_name, ", with language:", request.language)
                // this is the first time we request anything for this language
                // start a new http request
                var data = JSON.stringify({
                    "operationName": "questionTopicsList",
                    "variables": {
                        "orderBy": "most_votes",
                        "query": "",
                        "first": 10,
                        "tags": [
                            request.language
                        ],
                        "questionId": request.questionId
                    },
                    "query": "query questionTopicsList($questionId: String!, $orderBy: TopicSortingOption, $query: String, $first: Int!, $tags: [String!]) {\n  questionTopicsList(questionId: $questionId, orderBy: $orderBy, query: $query, first: $first, tags: $tags) {\n    ...TopicsList\n    __typename\n  }\n}\n\nfragment TopicsList on TopicConnection {\n  totalNum\n  edges {\n    node {\n      id\n      }}}"
                });
                var xhr = new XMLHttpRequest();
                xhr.withCredentials = true;
                xhr.addEventListener("readystatechange", function () {
                    if (this.readyState === 4 && this.status == 200) {
                        // we want to save the response url stuffs
                        discuss_post_url[question_name] = {};
                        discuss_post_url[question_name][request.language] = [];
                        discuss_post_selection[question_name] = {};
                        discuss_post_selection[question_name][request.language] = 0;
                        let nodes = this.response.data.questionTopicsList.edges;
                        // push the post ids to a list for accessing
                        for (var i = 0; i < nodes.length; i++) {
                            discuss_post_url[question_name][request.language].push(nodes[i].node.id);
                        }

                        console.log("Post ids:", discuss_post_url[question_name][request.language])
                        return_code_result(question_name, request.language);
                    }
                });
                xhr.open("POST", "https://leetcode.com/graphql");
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.responseType = 'json';
                xhr.send(data);
            }

        });
    }
});

// handle the tab changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // read changeInfo data and do something with it (like read the url)
    if (changeInfo.url && matched_tab_id.has(tabId)) {
        console.log(changeInfo.url);
        // whenever the url changes, we want to add the button
        chrome.tabs.sendMessage(tabId, { todo: "addButton" });
        chrome.tabs.sendMessage(tabId, { todo: "hideSolutionDiv" });
    }
});

function return_code_result(question_name, language) {
    // now we are sure that the post lists are pushed
    // so we want to access the page content
    // which is the code
    if (discuss_post_url[question_name][language].length > 0) {
        var data = JSON.stringify({
            "operationName": "DiscussTopic",
            "variables": {
                "topicId": discuss_post_url[question_name][language][discuss_post_selection[question_name][language]]
            },
            "query": "query DiscussTopic($topicId: Int!) {\n  topic(id: $topicId) {\n    id\n post {\n      ...DiscussPost\n}}\n}\n\nfragment DiscussPost on PostNode {\n  content\n }\n\n"
        });

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === 4 && this.status == 200) {
                var content = this.response.data.topic.post.content;
                // console.log(content);
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    // first get the current tab id
                    var current_tab_id = tabs[0].id;
                    var converter = new showdown.Converter();
                    content = content.replaceAll("\\n", "\n").replaceAll("\\t", "  ").replaceAll("\\'", "'").replaceAll('\\"', '"').trim();
                    var html_code = converter.makeHtml(content);
                    console.log(html_code); // this will produce the <code></code> tag element
                    chrome.tabs.sendMessage(current_tab_id, { todo: "pasteSolution", solution: html_code, success: true })
                });
                // add 1 to the selection so next time we will look at another one
                discuss_post_selection[question_name][language] += 1;
                discuss_post_selection[question_name][language] %= discuss_post_url[question_name][language].length;
            }
        });

        xhr.open("POST", "https://leetcode.com/graphql");
        xhr.setRequestHeader("content-type", "application/json");
        xhr.responseType = 'json';
        xhr.send(data);
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            // first get the current tab id
            var current_tab_id = tabs[0].id
            chrome.tabs.sendMessage(current_tab_id, { todo: "pasteSolution", success: false })
        });
    }

}