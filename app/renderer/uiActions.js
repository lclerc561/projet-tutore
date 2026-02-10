// renderer/uiActions.js
const fs = require('fs');
const path = require('path');
const templateManager = require('./templateManager');

module.exports = function creerNouvellePageUI(projectDir, refreshFiles, openFile) {
    if (!projectDir) {
        alert("⚠️ Charge un projet avant de créer une page");
        return;
    }

    if (document.getElementById('modal-new-page')) return;

    // === MODALE ===
    const overlay = document.createElement('div');
    overlay.id = 'modal-new-page';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = 2000;

    overlay.innerHTML = `
        <div style="
            background:white;
            padding:20px;
            border-radius:8px;
            width:360px;
            box-shadow:0 10px 30px rgba(0,0,0,0.3);
        ">
            <h3>➕ Nouvelle page Zola</h3>

            <label>Nom du fichier</label>
            <input id="new-page-name" type="text"
                placeholder="ex: a-propos"
                style="width:100%; padding:10px; margin:10px 0;">

            <label>Template</label>
            <select id="new-page-template"
                style="width:100%; padding:10px; margin-bottom:15px;">
                <option value="page">Page simple</option>
                <option value="blog">Article de blog</option>
            </select>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="cancel-new-page">Annuler</button>
                <button id="confirm-new-page"
                    style="background:#27ae60; color:white; border:none; padding:8px 12px;">
                    Créer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('new-page-name').focus();

    // === ANNULER ===
    document.getElementById('cancel-new-page').onclick = () => {
        overlay.remove();
    };

    // === CRÉER ===
    document.getElementById('confirm-new-page').onclick = () => {
        const nom = document.getElementById('new-page-name').value.trim();
        const templateId = document.getElementById('new-page-template').value;

        if (!nom) {
            alert("Le nom ne peut pas être vide");
            return;
        }

        const safeName = nom.replace(/[^a-zA-Z0-9-_]/g, '-');

        // 1️⃣ Charger template
        const template = templateManager.chargerTemplate(templateId);

        // 2️⃣ Générer valeurs par défaut
        const values = {
            title: safeName.replace(/-/g, ' '),
            slug: safeName,
            date: new Date().toISOString().split('T')[0]
        };

        // Champs body vides
        template.body.forEach(block => {
            values[block.id] = '';
        });

        // 3️⃣ Générer markdown
        const markdown = templateManager.genererMarkdownDepuisTemplate(template, values);

        // 4️⃣ Créer fichier
        const contentDir = path.join(projectDir, 'content', template.zola_section);
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
        }

        const filePath = path.join(contentDir, `${safeName}.md`);

        if (fs.existsSync(filePath)) {
            alert("❌ Ce fichier existe déjà");
            return;
        }

        fs.writeFileSync(filePath, markdown, 'utf8');

        overlay.remove();
        refreshFiles();
        openFile(filePath);
    };
};


// ===================================================
// TEMPLATES ZOLA
// ===================================================

function getPageTemplate(slug) {
    return `+++
title = "${humanize(slug)}"
draft = false
+++

# ${humanize(slug)}

Contenu de la page...
`;
}

function getBlogTemplate(slug) {
    const date = new Date().toISOString().split('T')[0];

    return `+++
title = "${humanize(slug)}"
date = ${date}
draft = false
+++

# ${humanize(slug)}

Introduction de l'article...
`;
}

function humanize(str) {
    return str
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}
