const templateRegistry = require('./templateRegistry');

function genererMarkdownDepuisTemplate(templateKey, nomPage) {
    const template = templateRegistry[templateKey];

    if (!template) {
        throw new Error("Template introuvable : " + templateKey);
    }

    const frontMatter = {};
    const extra = {};

    // --- FRONT MATTER ---
    for (const key in template.frontMatter) {
        const value = template.frontMatter[key];

        if (typeof value === 'function') {
            frontMatter[key] = value();
        } else if (key === 'title') {
            frontMatter[key] = nomPage;
        } else {
            frontMatter[key] = value;
        }
    }

    // --- EXTRA ---
    for (const key in template.extra) {
        extra[key] = template.extra[key];
    }

    // --- CONSTRUCTION TEXTE ---
    let markdown = "---\n";

    for (const key in frontMatter) {
        markdown += `${key}: "${frontMatter[key]}"\n`;
    }

    if (Object.keys(extra).length > 0) {
        markdown += "\n[extra]\n";
        for (const key in extra) {
            markdown += `${key} = "${extra[key]}"\n`;
        }
    }

    markdown += "---\n\n";

    // Remplace {{title}} dans le body
    const body = template.body.replace("{{title}}", nomPage);

    markdown += body;

    return markdown;
}

module.exports = {
    genererMarkdownDepuisTemplate
};
