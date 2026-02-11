// renderer/uiActions.js
const fs = require('fs');
const path = require('path');
const templateManager = require('./templateManager');
const templateRegistry = require('./templateRegistry');

module.exports = function creerNouvellePageUI(projectDir, refreshFiles, openFile) {

    if (!projectDir) {
        alert("⚠️ Charge un projet avant de créer une page");
        return;
    }

    if (document.getElementById('modal-new-page')) return;

    // ============================
    // MODALE
    // ============================

    const overlay = document.createElement('div');
    overlay.id = 'modal-new-page';
    overlay.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.5);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:2000;
    `;

    // Génération dynamique des templates
    let templateOptions = '';
    for (const key in templateRegistry) {
        templateOptions += `
            <option value="${key}">
                ${templateRegistry[key].label}
            </option>
        `;
    }

    overlay.innerHTML = `
        <div style="
            background:white;
            padding:20px;
            border-radius:8px;
            width:380px;
            box-shadow:0 10px 30px rgba(0,0,0,0.3);
        ">
            <h3 style="margin-top:0;">➕ Nouvelle page Zola</h3>

            <label style="font-weight:bold;">Nom du fichier</label>
            <input id="new-page-name" type="text"
                placeholder="ex: a-propos"
                style="width:100%; padding:10px; margin:10px 0;">

            <label style="font-weight:bold;">Template HTML</label>
            <select id="new-page-template"
                style="width:100%; padding:10px; margin-bottom:15px;">
                ${templateOptions}
            </select>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="cancel-new-page"
                    style="padding:8px 12px;">
                    Annuler
                </button>

                <button id="confirm-new-page"
                    style="background:#27ae60; color:white; border:none; padding:8px 12px;">
                    Créer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('new-page-name').focus();

    // ============================
    // ANNULATION
    // ============================

    document.getElementById('cancel-new-page').onclick = () => {
        overlay.remove();
    };

    // ============================
    // CRÉATION
    // ============================

    document.getElementById('confirm-new-page').onclick = () => {

        const nom = document.getElementById('new-page-name').value.trim();
        const templateKey = document.getElementById('new-page-template').value;

        if (!nom) {
            alert("Le nom ne peut pas être vide");
            return;
        }

        const safeName = nom.replace(/[^a-zA-Z0-9-_]/g, '-');

        try {

            // Génération automatique du markdown
            const markdown = templateManager.genererMarkdownDepuisTemplate(
                templateKey,
                safeName
            );

            // Dossier content
            const contentDir = path.join(projectDir, 'content');

            if (!fs.existsSync(contentDir)) {
                fs.mkdirSync(contentDir, { recursive: true });
            }

            const filePath = path.join(contentDir, `${safeName}.md`);

            if (fs.existsSync(filePath)) {
                afficherErreur("❌ Ce fichier existe déjà");
                return;
            }

            fs.writeFileSync(filePath, markdown, 'utf8');

            overlay.remove();
            refreshFiles();
            openFile(filePath);

        } catch (error) {
            console.error(error);
            afficherErreur("Erreur création page : " + error.message);
        }
    };

    function afficherErreur(message) {
    let errorDiv = document.getElementById('new-page-error');

    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'new-page-error';
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.marginBottom = '10px';
        errorDiv.style.fontWeight = 'bold';

        const modal = document.querySelector('#modal-new-page div');
        modal.insertBefore(errorDiv, modal.children[1]);
    }

    errorDiv.innerText = message;

    const input = document.getElementById('new-page-name');
    if (input) input.focus();
}

};
