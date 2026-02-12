// renderer/renderer.js
const path = require('path');
const fs = require('fs');
const { ipcRenderer, shell } = require('electron');

// --- IMPORTS ---
const fileManager = require('./fileManager');
const zolaManager = require('./zolaManager');
const formBuilder = require('./formBuilder');
const validators = require('./validators');
const gitManager = require('./gitManager');
const creerNouvellePageUI = require('./uiActions');
const templateManager = require('./templateManager');
const authManager = require('./authManager');

const {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst,
    insertParagraphAst,
    insertBlockquoteAst,
    insertListAst,
    insertCodeBlockAst,
    insertImageAst,
    insertVideoAst
} = require('./markdownAst');

// ============================================================
// 0. RÉCUPÉRATION DE L'AUTHENTIFICATION (URL Params)
// ============================================================
const urlParams = new URLSearchParams(window.location.search);
const roleParam = urlParams.get('role');
const tokenParam = urlParams.get('token');
const userParam = urlParams.get('user');

// Si aucun rôle n'est détecté, on renvoie vers la page de login
if (!roleParam) {
    window.location.href = 'login.html';
}

// Initialisation de l'utilisateur global
let currentUser = { 
    role: roleParam, 
    token: (tokenParam && tokenParam !== 'null') ? tokenParam : null 
};

// --- VARIABLES D'ÉTAT ---
let currentProjectDir = null;
let currentFilePath = null;
let formatActuel = 'yaml';
let currentAst = null;

function deconnexion() {
    authManager.logout();
}

// ============================================================
// 1. INITIALISATION DE L'INTERFACE
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    // Gestion de l'affichage du bouton Push selon le rôle
    const btnPush = document.getElementById('btn-push');
    if (btnPush) {
        btnPush.style.display = (currentUser.role === 'admin') ? 'block' : 'none';
    }
    
    // Message de bienvenue
    afficherMessage(`Bienvenue ${userParam || ''} (${currentUser.role.toUpperCase()})`, false);
});

// --- FIX FOCUS (Désormais sans conflit avec le login) ---
window.addEventListener('click', () => {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        window.focus();
    }
});


// ============================================================
// 2. GESTION PROJET
// ============================================================

async function choisirDossier() {
    const cheminDossier = await ipcRenderer.invoke('dialog:openDirectory');
    if (cheminDossier) {
        currentProjectDir = cheminDossier;
        chargerListeFichiers();
        
        gitManager.chargerHistorique(currentProjectDir, (hash) => {
            window.voirVersionRelais(hash);
        });

        const btn = document.querySelector('.sidebar-actions .btn-primary');
        if (btn) btn.innerText = "📂 " + path.basename(cheminDossier);
        
        afficherMessage("Dossier chargé avec succès !", false);
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
        div.className = "file-item"; // Utilise tes styles CSS
        div.onclick = () => ouvrirFichier(cheminComplet);
        sidebar.appendChild(div);
    });
}

// ============================================================
// 3. OUVERTURE FICHIER & AST
// ============================================================

function ouvrirFichier(chemin) {
    currentFilePath = chemin;
    const { data, content, format } = fileManager.parseMarkdownFile(chemin);
    formatActuel = format;
    
    try {
        currentAst = parseMarkdownToAst(content);
    } catch (e) {
        console.error(e);
        afficherMessage("Erreur lecture contenu (AST)", true);
        currentAst = { type: 'root', children: [] };
    }
    
    genererFormulaire(data);
}

function rafraichirInterface(frontMatter) {
    genererFormulaire(frontMatter);
}

function genererFormulaire(frontMatter) {
    const container = document.getElementById('form-container');

    const callbacks = {
        onImportImage: (inputId, previewId) => importerMedia(inputId, previewId, 'image'),
        onImportVideo: (inputId, previewId) => importerMedia(inputId, previewId, 'video'),
        nodeToMarkdown: (node) => {
            try { return astToMarkdown({ type: 'root', children: [node] }).trim(); } catch (e) { return ""; }
        },
        onAddHeading: (level, text) => { insertHeadingAst(currentAst, level, text); rafraichirInterface(frontMatter); },
        onAddParagraph: (text) => { insertParagraphAst(currentAst, text); rafraichirInterface(frontMatter); },
        onAddBlockquote: (text) => { insertBlockquoteAst(currentAst, text); rafraichirInterface(frontMatter); },
        onAddList: () => { insertListAst(currentAst); rafraichirInterface(frontMatter); },
        onAddCode: () => { insertCodeBlockAst(currentAst); rafraichirInterface(frontMatter); },
        onAddImageBlock: () => { insertImageAst(currentAst); rafraichirInterface(frontMatter); },
        onAddVideoBlock: () => { insertVideoAst(currentAst); rafraichirInterface(frontMatter); },
        onUpdateBlock: (index, newValue, mode) => {
            if (!currentAst || !currentAst.children[index]) return;
            const node = currentAst.children[index];
            if (mode === 'raw') {
                try {
                    const miniAst = parseMarkdownToAst(newValue);
                    if (miniAst.children && miniAst.children.length > 0) currentAst.children[index] = miniAst.children[0];
                } catch (e) { console.warn("Erreur parsing raw", e); }
            } else if (mode === 'blockquote') {
                if (!node.children || node.children.length === 0) node.children = [{ type: 'paragraph', children: [] }];
                node.children[0].children = [{ type: 'text', value: newValue }];
            } else if (mode === 'image') {
                let imgNode = node;
                if (node.type === 'paragraph' && node.children && node.children[0].type === 'image') {
                    imgNode = node.children[0];
                }
                if(newValue.url !== undefined) imgNode.url = newValue.url;
                if(newValue.alt !== undefined) imgNode.alt = newValue.alt;
            } else if (mode === 'video') {
                node.value = newValue;
            } else {
                if (node.children && node.children.length > 0) node.children[0].value = newValue;
                else node.children = [{ type: 'text', value: newValue }];
            }
        },
        onMoveBlock: (fromIndex, toIndex) => {
            if (fromIndex === toIndex) return;
            const [movedItem] = currentAst.children.splice(fromIndex, 1);
            currentAst.children.splice(toIndex, 0, movedItem);
            rafraichirInterface(frontMatter);
        },
        onDeleteBlock: (index) => {
            currentAst.children.splice(index, 1);
            rafraichirInterface(frontMatter);
        }
    };

    formBuilder.generateForm(container, frontMatter, currentAst, null, callbacks, currentProjectDir);
}

// ============================================================
// 4. IMPORTS MÉDIA
// ============================================================

async function importerMedia(inputId, previewId, type) {
    if (!currentProjectDir) return afficherMessage("Veuillez charger un projet d'abord.", true);

    const action = type === 'video' ? 'dialog:openVideo' : 'dialog:openImage';
    const cheminSource = await ipcRenderer.invoke(action);
    if (!cheminSource) return;

    const subFolder = type === 'video' ? 'videos' : 'images';
    const dossierCible = path.join(currentProjectDir, 'static', subFolder);
    if (!fs.existsSync(dossierCible)) fs.mkdirSync(dossierCible, { recursive: true });

    const nomFichier = path.basename(cheminSource);
    const cheminDestination = path.join(dossierCible, nomFichier);

    try {
        fs.copyFileSync(cheminSource, cheminDestination);
        const input = document.getElementById(inputId);
        if(input) {
            input.value = `/${subFolder}/${nomFichier}`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.src = `file://${cheminDestination}`;
            preview.style.display = 'block';
        }
        afficherMessage("Média importé !", false);
    } catch (err) {
        afficherMessage(`Erreur : ${err.message}`, true);
    }
}

// ============================================================
// 5. SAUVEGARDE, ZOLA ET GIT
// ============================================================

function sauvegarder() {
    if (!currentFilePath) return afficherMessage("Aucun fichier ouvert.", true);

    const schema = JSON.parse(document.getElementById('form-container').dataset.schema);
    const newConfig = {};

    schema.forEach(item => {
        const input = document.getElementById(`field-${item.context}-${item.key}`);
        if (!input) return;

        let val = input.type === 'checkbox' ? input.checked : input.value.trim();
        if (typeof val === 'string' && val.includes(',') && item.key !== 'title') {
            val = val.split(',').map(s => s.trim());
        }

        if (item.context === 'extra') {
            if (!newConfig.extra) newConfig.extra = {};
            newConfig.extra[item.key] = val;
        } else {
            newConfig[item.key] = val;
        }
    });

    const validation = validators.validerFormulaire(newConfig);
    if (!validation.isValid) return afficherMessage(validation.error, true);

    try {
        const newContent = astToMarkdown(currentAst);
        fileManager.saveMarkdownFile(currentFilePath, newConfig, newContent, formatActuel);
        afficherMessage("Sauvegarde réussie !", false);
    } catch (e) {
        afficherMessage("Erreur : " + e.message, true);
    }
}

function lancerZola() {
    if (!currentProjectDir) return afficherMessage("Chargez un projet d'abord", true);
    zolaManager.lancerServeur(currentProjectDir, (msg) => {
        afficherMessage(`Erreur Zola : ${msg}`, true);
        arreterZola();
    });
    document.getElementById('btn-launch').style.display = 'none';
    document.getElementById('btn-stop').style.display = 'block';
}

function arreterZola() {
    zolaManager.arreterServeur();
    document.getElementById('btn-launch').style.display = 'block';
    document.getElementById('btn-stop').style.display = 'none';
}

function confirmerGeneration() {
    const nomDossier = document.getElementById('prompt-input').value;
    if (!nomDossier) return;
    document.getElementById('custom-prompt').classList.remove('visible');
    const dossierSortie = path.join(__dirname, '../../rendu_genere', nomDossier.replace(/[^a-zA-Z0-9-_]/g, '_'));
    zolaManager.buildSite(currentProjectDir, dossierSortie, (err, stderr) => {
        if (err) afficherMessage(`Erreur : ${stderr}`, true);
        else afficherMessage("Site généré avec succès !", false);
    });
}

function nouvelleSauvegarde() {
    gitManager.nouvelleSauvegarde(currentProjectDir, afficherMessage, () => {
        gitManager.chargerHistorique(currentProjectDir, (h) => voirVersionRelais(h));
    });
}

function pushSite() { 
    if (currentUser.role !== 'admin' || !currentUser.token) {
        return afficherMessage("Action interdite : Token Admin requis.", true);
    }
    gitManager.pushToRemote(currentProjectDir, afficherMessage, currentUser.token); 
}

function revenirAuPresent() {
    gitManager.revenirAuPresent(currentProjectDir, {
        afficherMessage,
        reloadUI: () => { chargerListeFichiers(); if (currentFilePath) ouvrirFichier(currentFilePath); gitManager.chargerHistorique(currentProjectDir, (h) => voirVersionRelais(h)); }
    });
}

function voirVersionRelais(hash) {
    gitManager.voirVersion(hash, currentProjectDir, {
        afficherMessage,
        reloadUI: () => { chargerListeFichiers(); if (currentFilePath) ouvrirFichier(currentFilePath); }
    });
}

// ============================================================
// 6. UTILITAIRES & EXPORTS
// ============================================================

function afficherMessage(texte, estErreur) {
    const msgDiv = document.getElementById('status-message');
    if (!msgDiv) return;
    msgDiv.innerText = texte;
    msgDiv.style.display = 'block';
    msgDiv.style.backgroundColor = estErreur ? '#f8d7da' : '#d4edda';
    msgDiv.style.color = estErreur ? '#721c24' : '#155724';
    if (!estErreur) setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
}

window.creerNouvellePage = () => {
    if (!currentProjectDir) return alert("⚠️ Charge un projet d'abord");
    creerNouvellePageUI(currentProjectDir, chargerListeFichiers, ouvrirFichier);
};

// Exports globaux pour le HTML
window.choisirDossier = choisirDossier;
window.sauvegarder = sauvegarder;
window.lancerZola = lancerZola;
window.arreterZola = arreterZola;
window.genererSite = () => { document.getElementById('custom-prompt').classList.add('visible'); document.getElementById('prompt-input').focus(); };
window.fermerPrompt = () => { document.getElementById('custom-prompt').classList.remove('visible'); };
window.confirmerGeneration = confirmerGeneration;
window.nouvelleSauvegarde = nouvelleSauvegarde;
window.revenirAuPresent = revenirAuPresent;
window.pushSite = pushSite;
window.voirVersionRelais = voirVersionRelais;
window.getCurrentProjectDir = () => currentProjectDir;
window.deconnexion = deconnexion;