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

// Imports des modules de la feature "Création de page"
const creerNouvellePageUI = require('./uiActions');

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

// --- VARIABLES ---
let currentProjectDir = null;
let currentFilePath = null;
let formatActuel = 'yaml';
let currentAst = null;

// --- FIX FOCUS ---
window.addEventListener('click', () => {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        window.focus();
    }
});

// ============================================================
// 1. GESTION PROJET
// ============================================================

async function choisirDossier() {
    const cheminDossier = await ipcRenderer.invoke('dialog:openDirectory');
    if (cheminDossier) {
        currentProjectDir = cheminDossier;
        chargerListeFichiers();
        
        // Init Git
        gitManager.chargerHistorique(currentProjectDir, (hash) => {
            voirVersionRelais(hash);
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
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #34495e';
        div.onmouseover = () => div.style.backgroundColor = '#34495e';
        div.onmouseout = () => div.style.backgroundColor = 'transparent';
        div.onclick = () => ouvrirFichier(cheminComplet);
        sidebar.appendChild(div);
    });
}

// ============================================================
// 2. OUVERTURE FICHIER
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

// ============================================================
// 3. GÉNÉRATION FORMULAIRE
// ============================================================

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
                    if (miniAst.children && miniAst.children.length > 0) {
                        currentAst.children[index] = miniAst.children[0];
                    }
                } catch (e) { console.warn("Erreur parsing raw", e); }

            } else if (mode === 'blockquote') {
                if (!node.children || node.children.length === 0) {
                    node.children = [{ type: 'paragraph', children: [] }];
                }
                const pNode = node.children[0];
                pNode.children = [{ type: 'text', value: newValue }];

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
                if (node.children && node.children.length > 0) {
                    node.children[0].value = newValue;
                } else {
                    node.children = [{ type: 'text', value: newValue }];
                }
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
    if (!currentProjectDir) {
        afficherMessage("Veuillez charger un projet d'abord.", true);
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
        const cheminZola = `/${subFolder}/${nomFichier}`;

        const input = document.getElementById(inputId);
        if(input) {
            input.value = cheminZola;
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }

        const preview = document.getElementById(previewId);
        if (preview) {
            preview.src = `file://${cheminDestination}`;
            preview.style.display = 'block';
        }
        afficherMessage("Média importé avec succès !", false);
    } catch (err) {
        afficherMessage(`Erreur copie : ${err.message}`, true);
    }
}

// ============================================================
// 5. SAUVEGARDE
// ============================================================

function sauvegarder() {
    if (!currentFilePath) {
        afficherMessage("Aucun fichier ouvert.", true);
        return;
    }

    const schema = JSON.parse(document.getElementById('form-container').dataset.schema);
    const newConfig = {};

    schema.forEach(item => {
        const inputId = `field-${item.context}-${item.key}`;
        const input = document.getElementById(inputId);
        if (!input) return;

        let val;
        if (input.type === 'checkbox') val = input.checked;
        else if (input.value.includes(',') && item.key !== 'title') {
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
        afficherMessage(validation.error, true);
        return;
    }

    let newContent = "";
    try {
        newContent = astToMarkdown(currentAst);
    } catch (e) {
        afficherMessage("Erreur conversion contenu : " + e.message, true);
        return;
    }

    try {
        fileManager.saveMarkdownFile(currentFilePath, newConfig, newContent, formatActuel);
        afficherMessage("Sauvegarde réussie !", false);
    } catch (e) {
        afficherMessage("Erreur écriture fichier : " + e.message, true);
    }
}

// ============================================================
// 6. UTILITAIRES & EXPORTS
// ============================================================

function afficherMessage(texte, estErreur) {
    const msgDiv = document.getElementById('status-message');
    if (!msgDiv) return;
    msgDiv.innerText = texte;
    msgDiv.style.display = 'block';
    if (estErreur) {
        msgDiv.style.backgroundColor = '#f8d7da';
        msgDiv.style.color = '#721c24';
        msgDiv.style.border = '1px solid #f5c6cb';
    } else {
        msgDiv.style.backgroundColor = '#d4edda';
        msgDiv.style.color = '#155724';
        msgDiv.style.border = '1px solid #c3e6cb';
        setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
    }
}

function lancerZola() {
    if (!currentProjectDir) return afficherMessage("Chargez un projet d'abord", true);
    const btnLaunch = document.getElementById('btn-launch');
    btnLaunch.innerText = "⏳ ...";
    zolaManager.lancerServeur(currentProjectDir, (erreurMessage) => {
        afficherMessage(`Erreur Zola : ${erreurMessage}`, true);
        arreterZola();
    });
    setTimeout(() => {
        btnLaunch.style.display = 'none';
        document.getElementById('btn-stop').style.display = 'block';
        btnLaunch.innerText = "▶️ Prévisualiser (Serveur)";
        afficherMessage("Serveur Zola lancé !", false);
    }, 1000);
}

function arreterZola() {
    zolaManager.arreterServeur();
    document.getElementById('btn-launch').style.display = 'block';
    document.getElementById('btn-stop').style.display = 'none';
    afficherMessage("Serveur arrêté.", false);
}

function genererSite() {
    if (!currentProjectDir) return afficherMessage("Chargez un projet d'abord", true);
    document.getElementById('custom-prompt').classList.add('visible');
    document.getElementById('prompt-input').focus();
}

function fermerPrompt() {
    document.getElementById('custom-prompt').classList.remove('visible');
    document.getElementById('prompt-input').value = '';
}

function confirmerGeneration() {
    const nomDossier = document.getElementById('prompt-input').value;
    if (!nomDossier || nomDossier.trim() === "") return afficherMessage("Le nom ne peut pas être vide", true);
    fermerPrompt();
    const nomNettoye = nomDossier.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // Chemin relatif correct pour remonter de 'renderer' vers la racine puis 'rendu_genere'
    const dossierExportsRacine = path.join(__dirname, '../../rendu_genere'); 
    
    const dossierSortie = path.join(dossierExportsRacine, nomNettoye);
    if (!fs.existsSync(dossierExportsRacine)) fs.mkdirSync(dossierExportsRacine);
    if (fs.existsSync(dossierSortie)) return afficherMessage(`Le dossier "${nomNettoye}" existe déjà.`, true);
    afficherMessage("Génération en cours...", false);
    zolaManager.buildSite(currentProjectDir, dossierSortie, (error, stderr) => {
        if (error) afficherMessage(`Erreur génération : ${stderr}`, true);
        else afficherMessage(`Site généré dans : ${nomNettoye}`, false);
    });
}

function nouvelleSauvegarde() {
    gitManager.nouvelleSauvegarde(currentProjectDir, afficherMessage, () => {
        gitManager.chargerHistorique(currentProjectDir, (h) => voirVersionRelais(h));
    });
}

function pushSite() { gitManager.pushToRemote(currentProjectDir, afficherMessage); }

function revenirAuPresent() {
    gitManager.revenirAuPresent(currentProjectDir, {
        afficherMessage: afficherMessage,
        reloadUI: () => {
            chargerListeFichiers();
            if (currentFilePath) ouvrirFichier(currentFilePath);
            gitManager.chargerHistorique(currentProjectDir, (h) => voirVersionRelais(h));
        }
    });
}

function voirVersionRelais(hash) {
    gitManager.voirVersion(hash, currentProjectDir, {
        afficherMessage: afficherMessage,
        reloadUI: () => {
            chargerListeFichiers();
            if (currentFilePath) ouvrirFichier(currentFilePath);
        }
    });
}

// ============================================================
// 7. AJOUT DE PAGE (NOUVELLE FONCTIONNALITÉ)
// ============================================================

window.creerNouvellePage = () => {
    // Note: window.getCurrentProjectDir() est défini dans les exports plus bas
    const projectDir = currentProjectDir; 
    if (!projectDir) {
        alert("⚠️ Charge un projet avant de créer une page");
        return;
    }

    creerNouvellePageUI(
        projectDir,
        chargerListeFichiers, // On passe la fonction directement
        ouvrirFichier         // On passe la fonction directement
    );
};

// ============================================================
// 8. EXPORTS GLOBAUX
// ============================================================

window.choisirDossier = choisirDossier;
window.sauvegarder = sauvegarder;
window.lancerZola = lancerZola;
window.arreterZola = arreterZola;
window.genererSite = genererSite;
window.fermerPrompt = fermerPrompt;
window.confirmerGeneration = confirmerGeneration;
window.nouvelleSauvegarde = nouvelleSauvegarde;
window.revenirAuPresent = revenirAuPresent;
window.pushSite = pushSite;

// Exports pour les modules externes (feature camarade)
window.getCurrentProjectDir = () => currentProjectDir;
window.chargerListeFichiers = chargerListeFichiers;
window.ouvrirFichier = ouvrirFichier;