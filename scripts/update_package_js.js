"use strict";
var esprima = require("esprima");
var fs = require("fs");
var path = require("path");

var debug = false;

var input, inputPath, outputPath;

if (process.argv.length === 4) {
    input = process.argv[2];
    inputPath = process.argv[3];
    outputPath = "-";
} else if (process.argv.length === 3) {
    input = process.argv[2];
    inputPath = input;
    outputPath = input + ".new";
}

var offset = 0;
var content = fs.readFileSync(input, "utf-8");
var output = "";
var parsed = esprima.parse(content, {
    tokens: true,
    range: true
});

var libFiles = [];
var clientFiles = [];
var serverFiles = [];
var testsFiles = [];

var rootDir = path.dirname(inputPath);
//var testsDir = path.join(rootDir, "tests");

function ignoreFile(file, filePath) {
    var regex = new RegExp("\\.(png|jpg|jpeg|svg)$", "i");
    return file.indexOf(".") === 0 ||
        (filePath === "package.js" || filePath === "packages.json" ||  filePath === "README.md" || (filePath.search(regex) >= 1));
}

function tree(root, accs, acc) {

    if (fs.existsSync(root)) {

        fs.readdirSync(root).forEach(function(file) {
            var p = path.join(root, file);
            var relP = p.substring(rootDir.length + 1);
            var accRec = acc;
            if (!ignoreFile(file, relP)) {
                if (fs.lstatSync(p).isDirectory()) {
                    switch (file) {
                        case "client":
                            accRec = acc || accs.client;
                            break;
                        case "server":
                            accRec = acc || accs.server;
                            break;
                        case "lib":
                            accRec = acc || accs.lib;
                            break;
                        case "tests":
                            accRec = acc || accs.tests;
                            break;
                        default:
                    }

                    tree(p, accs, accRec);

                } else if (acc) {
                    acc.push(relP);
                } else {
                    throw new Error("file not in lib, client or server: '" + relP + "'");
                }
            }
        });
    }

}

tree(rootDir, {
    lib: libFiles,
    client: clientFiles,
    server: serverFiles,
    tests: testsFiles
}, undefined);


/*
    HTML template files are always loaded before everything else
    Files beginning with main. are loaded last
    Files inside any lib/ directory are loaded next
    Files with deeper paths are loaded next
    Files are then loaded in alphabetical order of the entire path

*/
function sortAccordingToMeteor(arr) {

    var endsWithHtmlRE = /.+\.html$/;
    var fileStartsWithMainRE = /^(.+\/)?main\.[^\/]+/;
    var dirLibRE = new RegExp("(^|/)lib/");

    var compareDepth = function(a, b) {
        var dA = (a.split("/").length - 1);
        var dB = (b.split("/").length - 1);
        return dB - dA; // return -1 or less if dA > dB i.e. depth of A is bigger than depth of B
    };

    var compareAlpha = function(a, b) {
        return (a < b) ? -1 : 1;

    };

    var compare = function(a, b) {
        if (a === b) {
            return 0;
        }
        var cmpByD;
        var aIsHtml = a.match(endsWithHtmlRE);
        var bIsHtml = b.match(endsWithHtmlRE);
        if (aIsHtml && !bIsHtml) {
            return -1;
        } else if (!aIsHtml && bIsHtml) {
            return 1;
        } else {
            var aIsMain = a.match(fileStartsWithMainRE);
            var bIsMain = b.match(fileStartsWithMainRE);
            if (aIsMain && !bIsMain) {
                return 1;
            } else if (!aIsMain && bIsMain) {
                return -1;
            } else {
                var aIsLib = a.match(dirLibRE);
                var bIsLib = b.match(dirLibRE);
                if (aIsLib && !bIsLib) {
                    return -1;
                } else if (!aIsLib && bIsLib) {
                    return 1;
                } else {
                    cmpByD = compareDepth(a, b);
                    if (cmpByD === 0) {
                        return compareAlpha(a, b);
                    } else {
                        return cmpByD;
                    }
                }
            }
        }
    };

    arr.sort(compare);
}

sortAccordingToMeteor(libFiles);
sortAccordingToMeteor(clientFiles);
sortAccordingToMeteor(serverFiles);

// tree(testsDir, testsFiles);

if (debug) console.log("lib", libFiles);
if (debug) console.log("client", clientFiles);
if (debug) console.log("server", serverFiles);
if (debug) console.log("tests", testsFiles);

if (debug) console.log(parsed.body);


function insertLibs(libs, dest, beginOffset, indent, endOffset) {
    output += content.substring(offset, beginOffset);

    if (libs.length !== 1) {
        output += "[\n" + indent;
    }

    output += libs.map(function(x) {
        return "\"" + x + "\"";
    }).join(",\n" + indent);

    if (libs.length !== 1) {
        output += "]";
    }
    if (dest) {
        output += ", [\"" + dest + "\"]";
    } else {
        output += "";
    }
    offset = endOffset;
}

function debugPrint(msg, x, content) {
    console.log(msg, x, content.substring(x.range[0], x.range[1]));
}

function isCall(functionName, x, content) {
    // debugPrint(x, content);
    if (x.type === "ExpressionStatement" &&
        x.expression.type === "CallExpression") {
        var cl = x.expression.callee;
        var fName = content.substring(cl.range[0], cl.range[1]);
        // console.log("isCall callee", fName);
        return functionName === fName;
    }
    return false;
}

function updateLibsInBody(body) {
    body.forEach(function(stmt) {
        if (isCall("api.addFiles", stmt, content)) {
            var firstArg = stmt.expression.arguments[0];
            var firstFile;
            var lastArg = stmt.expression.arguments[stmt.expression.arguments.length - 1];
            var spc;
            if (firstArg.type === "Literal") {
                firstFile = firstArg;
                spc = ""; // don't try to guess indent
            } else {
                firstFile = firstArg.elements[0];
                if (firstArg.elements.length === 0) {
                    return;
                }

                spc = content.substring(stmt.expression.arguments[0].range[0], firstFile.range[0]);
                spc = spc.substring(spc.indexOf("\n") + 1);
                if (!spc.match(/[ \t]+/)) {
                    spc = ""; // couldn't guess indent
                }
            }
            var files;
            var dest;
            if (firstFile.type === "Literal") {
                if (firstFile.value.indexOf("lib/") === 0) {
                    files = libFiles;
                    dest = "";
                } else if (firstFile.value.indexOf("client/") === 0) {
                    files = clientFiles;
                    dest = "client";
                } else if (firstFile.value.indexOf("server/") === 0) {
                    files = serverFiles;
                    dest = "server";
                } else if (firstFile.value.indexOf("tests/") === 0) {
                    files = testsFiles;
                    dest = "server";
                } else {


                    if ((firstArg !== lastArg) &&
                        (lastArg.type === "ArrayExpression") &&
                        (lastArg.elements.length === 1)) {
                        var arch = lastArg.elements[0];
                        if (arch.type === "Literal") {
                            dest = arch.value;
                            switch (arch.value) {
                                case "server":
                                    files = serverFiles;
                                    break;
                                case "client":
                                    files = clientFiles;
                                    break;
                                default:
                                    throw new Error("unexpected arch: " + arch.value);
                            }
                        }
                    } else {
                        // assuming libs
                        dest = "";
                        files = libFiles;
                    }
                }
                insertLibs(files, dest, firstArg.range[0], spc, lastArg.range[1]);
            } else {
                throw new Error("unexpected first member of first argument to addFiles:" + JSON.stringify(firstFile));
            }

        } else {
            output += content.substring(offset, stmt.range[1]);
            offset = stmt.range[1];
        }

    });

}

parsed.body.forEach(function(x) {
    if (x.type === "FunctionDeclaration" &&
        x.id.name === "configurePackage") {

        updateLibsInBody(x.body.body);

    } else if (isCall("Package.onTest", x, content)) {
        var body = x.expression.arguments[0];
        if (body.type === "FunctionExpression" && body.body.type === "BlockStatement") {
            updateLibsInBody(body.body.body);
        }
    } else {
        output += content.substring(offset, x.range[0]) + content.substring(x.range[0], x.range[1]);
        offset = x.range[1];
    }
});


output += content.substring(offset, content.length);

if (outputPath === "-") {
    process.stdout.write(output);
} else {
    fs.writeFileSync(outputPath, output);
}