function loadDynamicPage() {
    var series = getUrlParam("series", ""), chapter = getUrlParam("chapter", ""), content = getUrlParam("content", "index.txt");
    if (series != "") {
        var prev = document.getElementById("chapter.prev");
        var next = document.getElementById("chapter.next");
        if (chapter != "") {
            content = series + "/chapter_" + chapter + ".txt";
            {
                var chap = parseInt(chapter, 10) - 1;
                if (chap < 1) {
                    prev.innerHTML = "<a href=\"?series=" + series + "\">Back</a>";
                } else
                    prev.innerHTML = "<a href=\"?series=" + series + "&chapter=" + chap + "\">Previos</a>";
            }
            next.innerHTML = "<a href=\"?series=" + series + "&chapter=" + (parseInt(chapter, 10) + 1) + "\">Next</a>";
        } else {
            content = series + "/index.txt";
            prev.innerHTML = "<a href=\"?\">Back</a>";
            next.innerHTML = "<a href=\"?series=" + series + "&chapter=" + 1 + "\">First Chapter</a>";
        }
    }
    fetch(content)
        .then(response => response.text())
        .then((data) => {
            document.getElementById("content").innerHTML = parseContent(data);
        });
    document.body.onscroll = function () {
        var toTop = document.documentElement.scrollTop;
        var toBottom = document.documentElement.scrollHeight - document.documentElement.clientHeight - toTop;
        if (toTop > 0 && toBottom > 0) {
            document.getElementById("topbar").style.display = "none";
            document.getElementById("bottombar").style.display = "none";
        } else {
            document.getElementById("topbar").style.display = "block";
            document.getElementById("bottombar").style.display = "block";
        }
    }
}
function parseContent(content) {
    var annotations = [];
    var newhtml = "";

    //process comments
    for (var i = content.indexOf("#"); i != -1; i = content.indexOf("#", i + 1)) {
        var j = content.indexOf("\n", i + 1);
        if (i > 0 && content.charAt(i - 1) == "\n") // comment is own line, remove newline
            i--;
        if (j == -1) // comment is last line
            j = content.length;
        content = content.replaceBetween(i, j, "");
    }

    content = content.split(/\n\s*\n/);
    for (var i = 0; i < content.length; i++) {
        content[i] = content[i].split("\n");
    }

    for (var i = 0; i < content.length; i++) {
        var paragraph = content[i];
        newhtml += "<p id=\"content.p." + i + "\">";
        for (var j = 0; j < paragraph.length; j++) {
            var line = paragraph[j];
            //process styling ... also destroyes any inline html and therefor sanatizes the input
            for (var k = line.indexOf("<"); k != -1; k = line.indexOf("<", k + 1)) {
                var l = line.indexOf(">", k + 1);
                if (l != -1) {
                    var replacement = "";
                    var info = line.substring(k + 1, l).replace(/ /g, "").split(",");
                    for (var m = 0; m < info.length; m++) {
                        replacement += parseStyle(info[m]);
                    }
                    line = line.replaceBetween(k, l + 1, replacement);
                }
            }
            //proccess links
            for (var k = line.indexOf("("); k != -1; k = line.indexOf("(", k + 1)) {
                var escaped = false;
                var escapecount = 0;
                for (var l = k - 1; l >= 0 && line.charAt(l) == "\\"; l--) {
                    escaped = !escaped;
                    if (escaped)
                        escapecount++;
                }
                line = line.replaceBetween(k - escapecount, k, "");
                k -= escapecount;
                if (!escaped) {
                    var l = line.indexOf(")", k + 1);
                    if (l != -1) {
                        var linkname = line.substring(k + 1, l);
                        var linkref = linkname;
                        if (line.charAt(l + 1) == "{") {
                            var nl = line.indexOf("}", l + 1);
                            if (nl != -1) {
                                linkref = line.substring(l + 2, nl);
                                l = nl;
                            }
                            linkref = linkref.split(";");
                            var replacement = "";
                            if (linkref.length > 1) {
                                if (linkref[0] == "") {
                                    linkref[0] = getUrlParam("series", "");
                                    switch (linkref[1]) {
                                        case "+":
                                            linkref[1] = parseInt(getUrlParam("chapter", 0), 10) + 1;
                                            break;
                                        case "-":
                                            linkref[1] = parseInt(getUrlParam("chapter", 2), 10) - 1;
                                    }
                                }
                                if (linkref[1] != "") {
                                    replacement =
                                        "<a href=\"?series=" +
                                        linkref[0] +
                                        "&chapter=" +
                                        (linkref[1] > 0 ? linkref[1] : 1) +
                                        "\">" +
                                        linkname +
                                        "</a>";
                                } else {
                                    replacement =
                                        "<a href=\"?series=" +
                                        linkref[0] +
                                        "\">" +
                                        linkname +
                                        "</a>";
                                }
                            } else
                                replacement =
                                    "<a href=\"?content=" +
                                    linkref[0] +
                                    "\">" +
                                    linkname +
                                    "</a>";
                        }else{
                            replacement =
                                "<a href='" +
                                linkname +
                                "'>" +
                                linkname +
                                "</a>";
                        }
                        
                        line = line.replaceBetween(k, l + 1, replacement);
                        k += replacement.length - 1;
                    }
                }
            }
            //process annotations
            for (var k = line.indexOf("["); k != -1; k = line.indexOf("[", k + 1)) {
                var escaped = false;
                var escapecount = 0;
                for (var l = k - 1; l >= 0 && line.charAt(l) == "\\"; l--) {
                    escaped = !escaped;
                    if (escaped)
                        escapecount++;
                }
                line = line.replaceBetween(k - escapecount, k, "");
                k -= escapecount;
                if (!escaped) {
                    var l = line.indexOf("]", k + 1);
                    if (l != -1) {
                        annotations[annotations.length] = line.substring(k + 1, l);
                        var replacement =
                            "<a id=\"annotation.a." +
                            annotations.length +
                            "\" href=\"#annotation.p." +
                            annotations.length +
                            "\">[" +
                            annotations.length +
                            "]</a>";
                        line = line.replaceBetween(k, l + 1, replacement);
                        k += replacement.length - 1;
                    }
                }
            }
            //process embedding
            for (var k = line.indexOf("{"); k != -1; k = line.indexOf("{", k + 1)) {
                var l = line.indexOf("}", k + 1);
                if (l != -1) {
                    var replacement = "";
                    var type = line.substring(k + 1, l);
                    var m = type.indexOf(";");
                    if (m != -1) {
                        var ref = type.substring(m + 1);
                        type = type.substring(0, m);
                        var n = type.indexOf("!");
                        var style = "";
                        if (n != -1) {
                            style = type.substring(n + 1);
                            type = type.substring(0, n);
                        }
                        switch (type) {
                            case "image":
                            case "img":
                                replacement =
                                    "<img id=\"content.img\" " +
                                    parseImgStyle(style) +
                                    "src=\"" +
                                    ref +
                                    "\"></img>";
                                break;
                            case "audio":
                                replacement =
                                    "<audio id='content.audio' controls><source src='" + ref + "'>" + ref + "</audio>";
                                break;
                            default:
                                replacement =
                                    "<iframe id='content.iframe' src='" + ref + "'>" + ref + "</iframe>";
                        }
                    }
                    line = line.replaceBetween(k, l + 1, replacement);
                    k += replacement.length - 1;
                }
            }
            newhtml += "<span id=\"content.span\">" + line + "</span><br>";
        }
        newhtml += "</p>";
    }

    for (var i = 0; i < annotations.length; i++) {
        newhtml += "<p id=\"annotation.p." + (i + 1) + "\"><a href=\"#annotation.a." + (i + 1) + "\">[" + (i + 1) + "]</a> " + annotations[i] + "</p>";
    }
    return newhtml;
}
function parseImgStyle(content) {
    var ret = "style='";
    content = content.replace(/ /g, "").split(",");
    for (var i = 0; i < content.length; i++) {
        var value = "";
        var j = content[i].indexOf("=");
        if (j != -1) {
            value = content[i].substring(j + 1);
            content[i] = content[i].substring(0, j);
        }
        switch (content[i]) {
            case "width":
            case "w":
                ret += "width: " + value + ";";
                break;
            case "height":
            case "h":
                ret += "height: " + value + ";";
                break;
            default:
        }
    }
    ret += "'";
    return ret;
}
function parseStyle(content) {
    switch (content) {
        // Basic HTML style tags
        case "italic":
        case "i":
            return "<i>";
        case "/italic":
        case "/i":
            return "</i>";
        case "bold":
        case "b":
            return "<b>";
        case "/bold":
        case "/b":
            return "</b>";
        case "emphasized":
        case "em":
            return "<em>";
        case "/emphasized":
        case "/em":
            return "</em>";
        case "deleted":
        case "del":
            return "<del>";
        case "/deleted":
        case "/del":
            return "</del>";
        case "marked":
        case "mark":
            return "<mark>";
        case "/marked":
        case "/mark":
            return "</mark>";
        case "inserted":
        case "ins":
            return "<ins>";
        case "/inserted":
        case "/ins":
            return "</ins>";
        case "subscript":
        case "sub":
            return "<sub>";
        case "/subscript":
        case "/sub":
            return "</sub>";
        case "superscript":
        case "sup":
            return "<sup>";
        case "/superscript":
        case "/sup":
            return "</sup>";
        case "small":
            return "<small>";
        case "/small":
            return "</small>";
        case "strong":
            return "<strong>";
        case "/strong":
            return "</strong>";
        default:
            return "";
    }
}
function getUrlVars() {
    var vars = {};
    var url = window.location.href;
    { // Remove location inside site from last param
        var hashi = url.indexOf("#");
        if (hashi != -1)
            url = url.substring(0, hashi);
    }
    var parts = url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}
function getUrlParam(parameter, defaultvalue) {
    var urlparameter = defaultvalue;
    if (window.location.href.indexOf(parameter) > -1) {
        urlparameter = getUrlVars()[parameter];
    }
    return urlparameter;
}
String.prototype.replaceBetween = function (start, end, what) {
    return this.substring(0, start) + what + this.substring(end);
};