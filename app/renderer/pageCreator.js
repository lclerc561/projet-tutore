const fs = require('fs');
const path = require('path');

/**
 * Crée une nouvelle page Zola depuis un template
 */
function createZolaPage(projectDir, options) {
    const { fileName, template, section = '' } = options;

    if (!projectDir) {
        throw new Error('Projet non chargé');
    }

    if (!fileName || !template) {
        throw new Error('fileName et template requis');
    }

    const contentDir = path.join(projectDir, 'content');
    if (!fs.existsSync(contentDir)) {
        throw new Error('Dossier content/ introuvable');
    }

    const targetDir = section
        ? path.join(contentDir, section)
        : contentDir;

    fs.mkdirSync(targetDir, { recursive: true });

    const filePath = path.join(targetDir, `${fileName}.md`);

    if (fs.existsSync(filePath)) {
        throw new Error('Le fichier existe déjà');
    }

    const title = fileName.replace(/[-_]/g, ' ');

    const fileContent = `---
title: "${title}"
template: "${template}"
draft: false
---

`;

    fs.writeFileSync(filePath, fileContent, 'utf8');

    return filePath;
}

module.exports = {
    createZolaPage
};
