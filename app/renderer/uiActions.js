const fs = require('fs');
const path = require('path');
const templateManager = require('./templateManager');
const templateRegistry = require('./templateRegistry');

/**
 * Gère l'interface de création de nouvelle page avec une modale
 */
module.exports = function creerNouvellePageUI(projectDir, refreshFiles, openFile) {

    if (!projectDir) {
        console.warn("⚠️ Aucun projet chargé.");
        return;
    }

    // Évite de doubler la modale
    if (document.getElementById('modal-new-page')) return;

    // ============================
    // CRÉATION DE L'OVERLAY
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

    // Génération dynamique des options de templates depuis le registre
    let templateOptions = '';
    for (const key in templateRegistry) {
        templateOptions += `
            <option value="${key}">
                ${templateRegistry[key].label}
            </option>
        `;
    }

    overlay.innerHTML = `
        <div style="background:white; padding:20px; border-radius:8px; width:380px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <h3 style="margin-top:0; color:#2c3e50;">➕ Nouvelle page Zola</h3>

            <label style="font-weight:bold; display:block; margin-bottom:5px;">Nom du fichier (sans extension)</label>
            <input id="new-page-name" type="text" 
                placeholder="ex: ma-nouvelle-page" 
                style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">

            <label style="font-weight:bold; display:block; margin-bottom:5px;">Template</label>
            <select id="new-page-template" 
                style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ccc; border-radius:4px;">
                ${templateOptions}
            </select>

            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="cancel-new-page" class="btn" style="background:#bdc3c7; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Annuler</button>
                <button id="confirm-new-page" class="btn" style="background:#27ae60; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Créer la page</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Focus automatique sur l'input
    const inputNom = document.getElementById('new-page-name');
    inputNom.focus();

    // ============================
    // ACTIONS
    // ============================

    // Fermer
    document.getElementById('cancel-new-page').onclick = () => overlay.remove();

    // Valider
    document.getElementById('confirm-new-page').onclick = () => {
        const nom = inputNom.value.trim();
        const templateKey = document.getElementById('new-page-template').value;

        if (!nom) {
            afficherErreur("⚠️ Le nom est requis");
            return;
        }

        const safeName = nom.replace(/[^a-zA-Z0-9-_]/g, '-');
        const selectedTemplate = templateRegistry[templateKey];
        
        // Déterminer le dossier cible (content/ ou sous-section)
        const section = selectedTemplate.zola_section || '';
        const targetDir = section ? path.join(projectDir, 'content', section) : path.join(projectDir, 'content');

        try {
            // 1. Générer le contenu Markdown via le manager
            const markdown = templateManager.genererMarkdownDepuisTemplate(templateKey, safeName);

            // 2. Vérifier/Créer le dossier
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const filePath = path.join(targetDir, `${safeName}.md`);

            // 3. Vérifier si le fichier existe déjà
            if (fs.existsSync(filePath)) {
                afficherErreur("❌ Ce fichier existe déjà");
                return;
            }

            // 4. Écriture physique
            fs.writeFileSync(filePath, markdown, 'utf8');

            // 5. Nettoyage et mise à jour UI
            overlay.remove();
            refreshFiles();
            openFile(filePath);

        } catch (error) {
            console.error(error);
            afficherErreur("Erreur : " + error.message);
        }
    };

    function afficherErreur(message) {
        let errorDiv = document.getElementById('new-page-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'new-page-error';
            errorDiv.style.cssText = "color:#e74c3c; margin-bottom:10px; font-weight:bold; font-size:0.9em;";
            const modal = overlay.querySelector('div');
            modal.insertBefore(errorDiv, modal.children[1]);
        }
        errorDiv.innerText = message;
    }
};