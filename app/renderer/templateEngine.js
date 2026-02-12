const fs = require("fs");
const path = require("path");

function getTemplates(templatesDir) {
    if (!fs.existsSync(templatesDir)) return [];

    return fs.readdirSync(templatesDir)
        .filter(f => f.endsWith(".html"))
        .map(f => ({
            id: f,
            label: f.replace(".html", "")
        }));
}

function analyseTemplate(filePath) {
    const content = fs.readFileSync(filePath, "utf8");

    const pageVars = new Set();
    const extraVars = new Set();

    const pageMatches = content.match(/page\.(\w+)/g);
    if (pageMatches) {
        pageMatches.forEach(m => {
            const key = m.split(".")[1];
            if (!["content", "permalink", "extra"].includes(key)) {
                pageVars.add(key);
            }
        });
    }

    const extraMatches = content.match(/page\.extra\.(\w+)/g);
    if (extraMatches) {
        extraMatches.forEach(m => {
            const key = m.split(".")[2];
            extraVars.add(key);
        });
    }

    return {
        pageVars: Array.from(pageVars),
        extraVars: Array.from(extraVars)
    };
}

function generateMarkdown(templateName, analysis, values) {
    let md = "+++\n";

    analysis.pageVars.forEach(key => {
        const val = values[key] || "";
        if (key === "date") {
            md += `date = ${val}\n`;
        } else {
            md += `${key} = "${val}"\n`;
        }
    });

    md += `template = "${templateName}"\n`;

    if (analysis.extraVars.length > 0) {
        md += "\n[extra]\n";
        analysis.extraVars.forEach(key => {
            md += `${key} = "${values[key] || ""}"\n`;
        });
    }

    md += "+++\n\n";
    md += `# ${values.title || "Titre"}\n\n`;
    md += "Contenu ici...\n";

    return md;
}

module.exports = {
    getTemplates,
    analyseTemplate,
    generateMarkdown
};
