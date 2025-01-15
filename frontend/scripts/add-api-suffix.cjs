const fs = require("fs");
const path = require("path");
const process = require("process");

const TYPES_FILE = "types.gen.ts";
const INDEX_FILE = "index.ts";

function parseProcessArgs() {
    const cmdArgRegex = /^--(\w+)$/;
    const valueRegex = /^['"]?(.*?)['"]?$/;

    const argsMap = {};
    let lastCmdArg = null;
    for (const arg of process.argv.slice(2)) {
        const match = arg.match(cmdArgRegex);
        if (match) {
            argsMap[match[1]] = true;
            lastCmdArg = match[1];
        } else {
            const value = arg.match(valueRegex)[1];
            if (lastCmdArg) {
                if (argsMap[lastCmdArg] && argsMap[lastCmdArg] !== true) {
                    argsMap[lastCmdArg] = [...argsMap[lastCmdArg], value];
                    continue;
                }
                argsMap[lastCmdArg] = value;
            }
        }
    }

    return argsMap;
}

const parsedArgs = parseProcessArgs();

// Get process arguments
const suffix = parsedArgs.suffix;
let dir = parsedArgs.dir;
const encoding = parsedArgs.encoding ?? "utf8";
const exportTanstackQueryFromIndex = parsedArgs.exportTanstackQueryFromIndex ?? false;

if (!suffix) {
    throw new Error("No suffix provided, exiting");
}

if (!dir) {
    console.info("No dir provided, using cwd");
    dir = process.cwd();
}

const typesFilePath = path.join(dir, TYPES_FILE);
const indexFilePath = path.join(dir, INDEX_FILE);

if (!fs.existsSync(typesFilePath)) {
    throw new Error(`File ${typesFilePath} does not exist`);
}

const exportTypesRegExp = /^export (type|enum) (\w+)/gm;
const singleImportNameRegExp = /(\s*(\w+),?\s*)/g;

function makeImportTypesRegExp(currentDir) {
    const relativeTypesFilePath = path.relative(currentDir, typesFilePath);
    const parsedFilePath = path.parse(relativeTypesFilePath);
    let escapedFilePath = path
        .join(parsedFilePath.dir, parsedFilePath.name)
        .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    if (path.resolve(currentDir) === path.resolve(path.parse(typesFilePath).dir)) {
        escapedFilePath = `\\./${escapedFilePath}`;
    }
    return new RegExp(`^import type {((\\s*(\\w+),?\\s*)+)} from ["']${escapedFilePath}["'];`, "m");
}

// First, replace all occurences of exported types with the same type name plus the suffix
const typesFileContent = fs.readFileSync(typesFilePath, encoding);
const matches = typesFileContent.matchAll(exportTypesRegExp);

const exportNames = [];
for (const match of matches) {
    exportNames.push(match[2]);
}

let newTypesFileContent = typesFileContent.replace(exportTypesRegExp, `export $1 $2${suffix}`);
for (const exportName of exportNames) {
    const exportNameRegExp = new RegExp(`\\b${exportName}\\b`, "g");
    newTypesFileContent = newTypesFileContent.replace(exportNameRegExp, `${exportName}${suffix}`);
}
fs.writeFileSync(typesFilePath, newTypesFileContent);

console.log(`\u{2705} Added suffix to exported types in '${typesFilePath}'`);

function adjustImportedTypeNames(content, dir) {
    let newContent = content;
    const importTypesRegExp = makeImportTypesRegExp(dir);

    const match = content.match(importTypesRegExp);
    if (match === null) {
        return { newContent, gotAdjusted: false };
    }

    const matchedString = match[1];
    const singleImportMatches = matchedString.matchAll(singleImportNameRegExp);

    const importNames = [];
    for (const singleImportMatch of singleImportMatches) {
        importNames.push(singleImportMatch[2]);
    }

    for (const importName of importNames) {
        const importNameRegExp = new RegExp(`\\b${importName}\\b`, "g");
        newContent = newContent.replace(importNameRegExp, `${importName}${suffix}`);
    }

    return { newContent, gotAdjusted: true };
}

// Then, replace all occurences of imported types within all files in the given directory with the same type name plus the suffix
function recursivelyAdjustImportedTypeNames(dir) {
    const filesAndDirs = fs.readdirSync(dir);
    for (const fileOrDir of filesAndDirs) {
        const fileOrDirPath = path.join(dir, fileOrDir);
        if (fs.statSync(fileOrDirPath).isDirectory()) {
            recursivelyAdjustImportedTypeNames(fileOrDirPath);
            continue;
        }

        const fileContent = fs.readFileSync(fileOrDirPath, encoding);
        const { newContent, gotAdjusted } = adjustImportedTypeNames(fileContent, dir);
        fs.writeFileSync(fileOrDirPath, newContent);

        if (gotAdjusted) {
            console.log(`\u{2705} Added suffix to imported types in '${fileOrDirPath}'`);
        }
    }
}

recursivelyAdjustImportedTypeNames(dir);

// Finally, re-export all TanstackQuery exports from the index file
if (exportTanstackQueryFromIndex) {
    let indexFileContent = fs.readFileSync(indexFilePath, encoding);
    indexFileContent += `\nexport * from './@tanstack/react-query.gen';\n`;
    fs.writeFileSync(indexFilePath, indexFileContent);
    console.log(`\u{2705} Added re-export statement for tanstack query exports in '${indexFilePath}'`);
}
