const fs = require('fs');
const path = require('path');

function chargerTemplate(templateId) {
    const templatePath = path.join(__dirname, 'templates', `${templateId}.json`);
    return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
}

function genererMarkdownDepuisTemplate(template, values) {
    let md = '+++\n';

    for (const key in template.front_matter) {
        const val = values[key];
        if (val !== undefined && val !== '') {
            if (Array.isArray(val)) {
                md += `${key} = [${val.map(v => `"${v}"`).join(', ')}]\n`;
            } else {
                md += `${key} = "${val}"\n`;
            }
        }
    }

    md += '+++\n\n';

    template.body.forEach(block => {
        const val = values[block.id];
        if (!val) return;

        if (block.type.startsWith('h')) {
            const level = parseInt(block.type.replace('h', ''), 10);
            md += `${'#'.repeat(level)} ${val}\n\n`;
        } else {
            md += `${val}\n\n`;
        }
    });

    return md;
}

module.exports = {
    chargerTemplate,
    genererMarkdownDepuisTemplate
};
