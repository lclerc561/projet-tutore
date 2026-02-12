// renderer/uiActions.js
const fs = require('fs');
const path = require('path');
const templateEngine = require('./templateEngine');

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

    const templatesDir = path.join(__dirname, "../templates");
    const templates = templateEngine.getTemplates(templatesDir);

    let templateOptions = templates.map(t =>
        `<option value="${t.id}">${t.label}</option>`
    ).join("");

    if (!templateOptions) {
        templateOptions = `<option disabled>Aucun template trouvé</option>`;
    }

    overlay.innerHTML = `
        <div id="modal-content" style="
            background:white;
            padding:20px;
            border-radius:8px;
            width:380px;
            box-shadow:0 10px 30px rgba(0,0,0,0.3);
        ">
            <h3 style="margin-top:0;">➕ Nouvelle page Zola</h3>

            <div id="new-page-error"></div>

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
                <button id="cancel-new-page" style="padding:8px 12px;">
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
        const templateFile = document.getElementById('new-page-template').value;

        if (!nom) {
            afficherErreur("Le nom ne peut pas être vide");
            return;
        }

        const safeName = nom.replace(/[^a-zA-Z0-9-_]/g, '-');

        try {

            const templatePath = path.join(templatesDir, templateFile);

            if (!fs.existsSync(templatePath)) {
                afficherErreur("Template introuvable");
                return;
            }

            // 🔎 Analyse automatique du template HTML
            const analysis = templateEngine.analyseTemplate(templatePath);

            // 🎯 Génération automatique des valeurs
            const values = {};

            analysis.pageVars.forEach(key => {
                if (key === "title") {
                    values[key] = safeName.replace(/-/g, " ");
                } else if (key === "date") {
                    values[key] = new Date().toISOString().split("T")[0];
                } else {
                    values[key] = "";
                }
            });

            analysis.extraVars.forEach(key => {
                values[key] = "";
            });

            // 📝 Génération markdown
            const markdown = templateEngine.generateMarkdown(
                templateFile,
                analysis,
                values
            );

            // 📂 Dossier content
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

    // ============================
    // GESTION ERREUR
    // ============================

    function afficherErreur(message) {
        const errorDiv = document.getElementById('new-page-error');
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.marginBottom = '10px';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.innerText = message;

        const input = document.getElementById('new-page-name');
        if (input) input.focus();
    }
};
