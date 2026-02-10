// renderer/renderer.js
const path = require('path');
const fs = require('fs');
const { ipcRenderer, shell } = require('electron');

// --- IMPORTS DES MODULES LOCAUX ---
const creerNouvellePageUI = require('./uiActions');
const templateManager = require('./templateManager');
const fileManager = require('./fileManager');
const zolaManager = require('./zolaManager');
const formBuilder = require('./formBuilder');
const validators = require('./validators');
const { 
    parseMarkdownToAst, 
    astToMarkdown, 
    insertHeadingAst, 
    insertParagraphAst 
} = require('./markdownAst');

// --- VARIABLES D'ÉTAT ---
let currentProjectDir = null;
let currentFilePath = null;
let formatActuel = 'yaml'; // Stocké pour la sauvegarde
let currentAst = null;     // Stocke la structure du markdown en mémoire

// --- FIX FOCUS ---
window.addEventListener('click', () => {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        window.focus();
    }
});

// ============================================================
// 1. GESTION DU DOSSIER ET FICHIERS
// ============================================================

async function choisirDossier() {
    const cheminDossier = await ipcRenderer.invoke('dialog:openDirectory');
    if (cheminDossier) {
        currentProjectDir = cheminDossier;
        chargerListeFichiers();
        console.log(`Projet chargé : ${currentProjectDir}`);
        
        const btn = document.querySelector('.sidebar-actions .btn-primary');
        if(btn) btn.innerText = "📂 Projet Chargé";
    }
}

function chargerListeFichiers() {
    const sidebar = document.getElementById('file-list');
    sidebar.innerHTML = '';

    if (!currentProjectDir) return;

    const fichiers = fileManager.getAllFiles(currentProjectDir);

    fichiers.forEach(cheminComplet => {
        const div = document.createElement('div');
        div.innerText = path.relative(currentProjectDir, cheminComplet);
        
        div.onmouseover = () => div.style.backgroundColor = '#34495e';
        div.onmouseout = () => div.style.backgroundColor = 'transparent';

        div.onclick = () => ouvrirFichier(cheminComplet);

        sidebar.appendChild(div);
    });
}

// ============================================================
// 2. OUVERTURE ET AST
// ============================================================

function ouvrirFichier(chemin) {
    currentFilePath = chemin;
    const { data, content, format } = fileManager.parseMarkdownFile(chemin);
    
    formatActuel = format;
    console.log(`Fichier ouvert :`, chemin);

    try {
        currentAst = parseMarkdownToAst(content);
    } catch(e) {
        console.warn("Erreur parsing AST, fallback", e);
    }

    genererFormulaire(data, content);
}

// ============================================================
// 3. GÉNÉRATION FORMULAIRE
// ============================================================

function genererFormulaire(frontMatter, markdownContent) {
    const container = document.getElementById('form-container');
    const schema = []; 

    const callbacks = {
        onImportImage: (inputId, previewId) => {
            importerMedia(inputId, previewId, 'image');
        },
        onImportVideo: (inputId, previewId) => {
            importerMedia(inputId, previewId, 'video');
        },
        onAddHeading: (level, text) => {
            if (!text || text.trim() === '') return;
            const textArea = document.getElementById('field-content');
            currentAst = parseMarkdownToAst(textArea.value);
            insertHeadingAst(currentAst, level, text);
            textArea.value = astToMarkdown(currentAst);
        },
        onAddParagraph: (text) => {
            if (!text || text.trim() === '') return;
            const textArea = document.getElementById('field-content');
            currentAst = parseMarkdownToAst(textArea.value);
            insertParagraphAst(currentAst, text);
            textArea.value = astToMarkdown(currentAst);
        }
    };

    formBuilder.generateForm(container, frontMatter, markdownContent, schema, callbacks);
    container.dataset.schema = JSON.stringify(schema);
}

// ============================================================
// 4. LOGIQUE D'IMPORT MÉDIA
// ============================================================

async function importerMedia(inputId, previewId, type) {
    if (!currentProjectDir) {
        afficherMessage("⚠️ Veuillez charger un projet d'abord.", true);
        return;
    }

    const action = type === 'video' ? 'dialog:openVideo' : 'dialog:openImage';
    const cheminSource = await ipcRenderer.invoke(action);
    
    if (!cheminSource) return; 

    const subFolder = type === 'video' ? 'videos' : 'images';
    const dossierCible = path.join(currentProjectDir, 'static', subFolder);
    
    if (!fs.existsSync(dossierCible)) {
        fs.mkdirSync(dossierCible, { recursive: true });
    }

    const nomFichier = path.basename(cheminSource);
    const cheminDestination = path.join(dossierCible, nomFichier);

    try {
        fs.copyFileSync(cheminSource, cheminDestination);
        
        document.getElementById(inputId).value = `/${subFolder}/${nomFichier}`;
        
        const preview = document.getElementById(previewId);
        if(preview) {
            preview.src = `file://${cheminDestination}`;
            preview.style.display = 'block';
        }
        console.log(`${type} copiée vers : ${cheminDestination}`);
    } catch (err) {
        console.error(err);
        // REMPLACEMENT ALERT -> afficherMessage
        afficherMessage(`Erreur copie : ${err.message}`, true);
    }
}

// ============================================================
// 5. SAUVEGARDE
// ============================================================

function sauvegarder() {
    if (!currentFilePath) return;

    const schema = JSON.parse(document.getElementById('form-container').dataset.schema);
    const newConfig = {};

    schema.forEach(item => {
        const inputId = `field-${item.context}-${item.key}`;
        const input = document.getElementById(inputId);
        let val;
        
        if (input.type === 'checkbox') {
            val = input.checked;
        } else if (input.value.includes(',')) {
            val = input.value.split(',').map(s => s.trim());
        } else {
            val = input.value.trim();
        }

        if (item.context === 'extra') {
            if (!newConfig.extra) newConfig.extra = {};
            newConfig.extra[item.key] = val;
        } else {
            newConfig[item.key] = val;
        }
    });

    const validation = validators.validerFormulaire(newConfig);
    if (!validation.isValid) {
        afficherMessage("⚠️ " + validation.error, true);
        return; 
    }

    const newContent = document.getElementById('field-content').value;

    try {
        fileManager.saveMarkdownFile(currentFilePath, newConfig, newContent, formatActuel);
        ouvrirFichier(currentFilePath); 
        afficherMessage("✅ Sauvegarde réussie !", false);
    } catch (e) {
        console.error(e);
        afficherMessage("Erreur sauvegarde : " + e.message, true);
    }
}

// Helper pour afficher les notifs
function afficherMessage(texte, estErreur) {
    const msgDiv = document.getElementById('status-message');
    if(!msgDiv) return;
    
    msgDiv.innerText = texte;
    msgDiv.style.display = 'block';
    
    if (estErreur) {
        msgDiv.style.backgroundColor = '#f8d7da';
        msgDiv.style.color = '#721c24';
    } else {
        msgDiv.style.backgroundColor = '#d4edda';
        msgDiv.style.color = '#155724';
        setTimeout(() => { msgDiv.style.display = 'none'; }, 4000);
    }
}

// ============================================================
// 6. GESTION ZOLA
// ============================================================

function lancerZola() {
    if (!currentProjectDir) {
        afficherMessage("⚠️ Chargez un projet d'abord !", true);
        return;
    }

    const btnLaunch = document.getElementById('btn-launch');
    const btnStop = document.getElementById('btn-stop');
    
    btnLaunch.innerText = "⏳ Démarrage...";

    zolaManager.lancerServeur(currentProjectDir, (erreurMessage) => {
        // REMPLACEMENT ALERT -> afficherMessage
        console.error(erreurMessage);
        afficherMessage(`Erreur Zola : ${erreurMessage}`, true);
        arreterZola();
    });

    setTimeout(() => {
        btnLaunch.style.display = 'none';
        btnStop.style.display = 'block';
        btnLaunch.innerText = "▶️ Prévisualiser (Serveur)";
    }, 1000);
}

function arreterZola() {
    zolaManager.arreterServeur();
    
    const btnLaunch = document.getElementById('btn-launch');
    const btnStop = document.getElementById('btn-stop');
    
    if (btnLaunch && btnStop) {
        btnStop.style.display = 'none';
        btnLaunch.style.display = 'block';
    }
}

function genererSite() {
    if (!currentProjectDir) {
        afficherMessage("⚠️ Chargez un projet d'abord !", true);
        return;
    }
    document.getElementById('custom-prompt').classList.add('visible');
    document.getElementById('prompt-input').focus();
}

function fermerPrompt() {
    document.getElementById('custom-prompt').classList.remove('visible');
    document.getElementById('prompt-input').value = ''; 
}

function confirmerGeneration() {
    const nomDossier = document.getElementById('prompt-input').value;
    
    if (!nomDossier || nomDossier.trim() === "") {
        // REMPLACEMENT ALERT
        // On ferme le prompt et on affiche l'erreur dans l'éditeur
        fermerPrompt();
        afficherMessage("⚠️ Le nom du dossier ne peut pas être vide !", true);
        return;
    }
    
    fermerPrompt(); 

    const nomNettoye = nomDossier.replace(/[^a-zA-Z0-9-_]/g, '_');
    const dossierExportsRacine = path.join(__dirname, 'rendu_genere');
    const dossierSortie = path.join(dossierExportsRacine, nomNettoye);

    if (!fs.existsSync(dossierExportsRacine)) {
        fs.mkdirSync(dossierExportsRacine);
    }
    
    if (fs.existsSync(dossierSortie)) {
        afficherMessage(`⚠️ Le dossier "${nomNettoye}" existe déjà.`, true);
        return;
    }

    const btn = document.querySelector('.sidebar-actions .btn-purple');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Génération...";

    zolaManager.buildSite(currentProjectDir, dossierSortie, (error, stderr) => {
        btn.innerText = oldText; 

        if (error) {
            console.error(error);
            // REMPLACEMENT ALERT -> afficherMessage
            afficherMessage(`❌ Erreur génération : ${stderr}`, true);
        } else {
            // SUCCÈS : Plus de confirm(), on ouvre le dossier directement
            afficherMessage(`✅ Site généré : ${nomNettoye}`, false);
            
            // Ouvrir le dossier automatiquement (plus fluide)
            shell.openPath(dossierSortie);
        }
    });
}

// ============================================================
// 7. AJOUT DE PAGE
// ============================================================

window.creerNouvellePage = () => {
    const projectDir = window.getCurrentProjectDir();
    if (!projectDir) {
        alert("⚠️ Charge un projet avant de créer une page");
        return;
    }

    creerNouvellePageUI(
        projectDir,
        window.chargerListeFichiers,
        window.ouvrirFichier
    );
};



// ============================================================
// 8. EXPOSITION
// ============================================================

window.choisirDossier = choisirDossier;
window.sauvegarder = sauvegarder;
window.lancerZola = lancerZola;
window.arreterZola = arreterZola;
window.genererSite = genererSite;
window.fermerPrompt = fermerPrompt;
window.confirmerGeneration = confirmerGeneration;
window.getCurrentProjectDir = () => currentProjectDir;
window.chargerListeFichiers = chargerListeFichiers;
window.ouvrirFichier = ouvrirFichier;
