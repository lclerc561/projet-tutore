// renderer/renderer.js
const path = require('path');
const fs = require('fs');
const { ipcRenderer, shell } = require('electron');

// --- IMPORTS ---
const fileManager = require('./fileManager');
const zolaManager = require('./zolaManager');
const formBuilder = require('./formBuilder');
const gitManager = require('./gitManager');
const authManager = require('./authManager'); 
const creerNouvellePageUI = require('./uiActions');
const templateManager = require('./templateManager');

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

if (!roleParam) {
    window.location.href = 'login.html';
}

authManager.login(userParam, roleParam, (tokenParam && tokenParam !== 'null') ? tokenParam : null);
let currentUser = authManager.getCurrentUser();

// --- VARIABLES D'ÉTAT ---
let currentProjectDir = null;
let currentFilePath = null;
let formatActuel = 'yaml';
let currentAst = null;

// ============================================================
// 1. INITIALISATION & SÉCURITÉ FOCUS
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    const btnPush = document.getElementById('btn-push');
    if (btnPush) {
        btnPush.style.display = (currentUser.role === 'admin') ? 'block' : 'none';
    }
    afficherMessage(`Connecté : ${userParam} (${currentUser.role})`, false);
});

// FIX FOCUS SÉCURISÉ : Ne bloque plus la saisie
window.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        window.focus();
    }
});

function deconnexion() {
    authManager.logout();
}

// ============================================================
// 2. GESTION PROJET & FICHIERS
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
        div.className = "file-item"; 
        div.onclick = () => ouvrirFichier(cheminComplet);
        sidebar.appendChild(div);
    });
}

function ouvrirFichier(chemin) {
    currentFilePath = chemin;
    const { data, content, format } = fileManager.parseMarkdownFile(chemin);
    formatActuel = format;
    
    try {
        currentAst = parseMarkdownToAst(content);
    } catch (e) {
        afficherMessage("Erreur lecture contenu (AST)", true);
        currentAst = { type: 'root', children: [] };
    }
    
    genererFormulaire(data);
}

// ============================================================
// 3. ÉDITION & FORMULAIRE (AST)
// ============================================================

function genererFormulaire(frontMatter) {
    const container = document.getElementById('form-container');
    const rafraichir = () => genererFormulaire(frontMatter);

    const callbacks = {
        onImportImage: (id, prev) => importerMedia(id, prev, 'image'),
        onImportVideo: (id, prev) => importerMedia(id, prev, 'video'),
        nodeToMarkdown: (node) => {
            try { return astToMarkdown({ type: 'root', children: [node] }).trim(); } catch (e) { return ""; }
        },
        onAddHeading: (l, t) => { insertHeadingAst(currentAst, l, t); rafraichir(); },
        onAddParagraph: (t) => { insertParagraphAst(currentAst, t); rafraichir(); },
        onAddBlockquote: (t) => { insertBlockquoteAst(currentAst, t); rafraichir(); },
        onAddList: () => { insertListAst(currentAst); rafraichir(); },
        onAddCode: () => { insertCodeBlockAst(currentAst); rafraichir(); },
        onAddImageBlock: () => { insertImageAst(currentAst); rafraichir(); },
        onAddVideoBlock: () => { insertVideoAst(currentAst); rafraichir(); },
        onUpdateBlock: (index, newValue, mode) => {
            if (!currentAst || !currentAst.children[index]) return;
            const node = currentAst.children[index];
            if (mode === 'raw') {
                try {
                    const miniAst = parseMarkdownToAst(newValue);
                    if (miniAst.children?.length > 0) currentAst.children[index] = miniAst.children[0];
                } catch (e) { console.warn("Erreur parsing raw", e); }
            } else if (mode === 'blockquote') {
                if (!node.children || node.children.length === 0) node.children = [{ type: 'paragraph', children: [] }];
                node.children[0].children = [{ type: 'text', value: newValue }];
            } else if (mode === 'image') {
                let imgNode = (node.type === 'paragraph' && node.children?.[0].type === 'image') ? node.children[0] : node;
                if(newValue.url !== undefined) imgNode.url = newValue.url;
                if(newValue.alt !== undefined) imgNode.alt = newValue.alt;
            } else {
                if (node.children?.length > 0) node.children[0].value = newValue;
                else node.children = [{ type: 'text', value: newValue }];
            }
        },
        onMoveBlock: (from, to) => {
            const [moved] = currentAst.children.splice(from, 1);
            currentAst.children.splice(to, 0, moved);
            rafraichir();
        },
        onDeleteBlock: (i) => {
            currentAst.children.splice(i, 1);
            rafraichir();
        }
    };

    formBuilder.generateForm(container, frontMatter, currentAst, null, callbacks, currentProjectDir);
}

// ============================================================
// 4. SAUVEGARDE & GIT
// ============================================================

function sauvegarder() {
    if (!currentFilePath) return afficherMessage("Aucun fichier ouvert.", true);
    try {
        const newContent = astToMarkdown(currentAst);
        // Ici, on part du principe que data est récupéré via formBuilder ou une variable persistante
        fileManager.saveMarkdownFile(currentFilePath, {}, newContent, formatActuel);
        afficherMessage("Sauvegarde réussie !", false);
    } catch (e) { afficherMessage("Erreur : " + e.message, true); }
}

function pushSite() { 
    const user = authManager.getCurrentUser();
    if (user?.role !== 'admin' || !user.token) {
        return afficherMessage("Action interdite : Token Admin requis.", true);
    }
    gitManager.pushToRemote(currentProjectDir, afficherMessage, user.token); 
}

// ============================================================
// 5. EXPORTS GLOBAUX & NOUVELLE PAGE
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

// Suppression de l'alert() ici pour ne pas casser le focus
window.creerNouvellePage = () => {
    if (!currentProjectDir) {
        return afficherMessage("⚠️ Veuillez charger un projet d'abord", true);
    }
    creerNouvellePageUI(currentProjectDir, chargerListeFichiers, ouvrirFichier);
};

window.choisirDossier = choisirDossier;
window.sauvegarder = sauvegarder;
window.deconnexion = deconnexion;
window.pushSite = pushSite;
window.lancerZola = () => zolaManager.lancerServeur(currentProjectDir, (m) => afficherMessage(m, true));
window.arreterZola = () => zolaManager.arreterServeur();
window.nouvelleSauvegarde = () => gitManager.nouvelleSauvegarde(currentProjectDir, afficherMessage, chargerListeFichiers);
window.revenirAuPresent = () => gitManager.revenirAuPresent(currentProjectDir, { afficherMessage, reloadUI: chargerListeFichiers });
window.voirVersionRelais = (h) => gitManager.voirVersion(h, currentProjectDir, { afficherMessage, reloadUI: chargerListeFichiers });
window.genererSite = () => { document.getElementById('custom-prompt').classList.add('visible'); document.getElementById('prompt-input').focus(); };
window.confirmerGeneration = () => { /* logique build */ };
window.fermerPrompt = () => { document.getElementById('custom-prompt').classList.remove('visible'); };