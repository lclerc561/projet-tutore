const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const toml = require('@iarna/toml');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.md')) {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

function parseMarkdownFile(chemin) {
    const contenuBrut = fs.readFileSync(chemin, 'utf8');
    let format = 'yaml';
    let parsed;

    if (contenuBrut.trim().startsWith('+++')) {
        format = 'toml';
        parsed = matter(contenuBrut, {
            engines: { toml: toml.parse.bind(toml) },
            language: 'toml',
            delimiters: '+++'
        });
    } else {
        parsed = matter(contenuBrut);
    }
    return { data: parsed.data, content: parsed.content, format };
}

function saveMarkdownFile(chemin, data, content, format) {
    let fileString;
    if (format === 'toml') {
        fileString = matter.stringify(content, data, {
            engines: { toml: toml },
            language: 'toml',
            delimiters: '+++'
        });
    } else {
        fileString = matter.stringify(content, data);
    }
    fs.writeFileSync(chemin, fileString);
}

module.exports = { getAllFiles, parseMarkdownFile, saveMarkdownFile };