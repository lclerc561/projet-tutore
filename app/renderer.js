const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { ipcRenderer, shell } = require('electron');
const { exec } = require('child_process');

let currentProjectDir = null;
let currentFilePath = null;
let processusZola = null;
let arretVolontaire = false; // NOUVEAU : Pour savoir si c'est toi qui as stoppé

// --- FIX FOCUS ---
window.addEventListener('click', () => {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        window.focus();
    }
});

// --- 1. GESTION DU DOSSIER ---
async function choisirDossier() {
    const cheminDossier = await ipcRenderer.invoke('dialog:openDirectory');
    if (cheminDossier) {
        currentProjectDir = cheminDossier;
        chargerListeFichiers();
        console.log(`Projet chargé : ${currentProjectDir}`);
        
        const btn = document.querySelector('button');
        if(btn) btn.innerText = "📂 Projet Chargé !";
    }
}

// --- 2. LECTURE DES FICHIERS ---
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.md')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });
    return arrayOfFiles;
}

function chargerListeFichiers() {
    const sidebar = document.getElementById('file-list');
    sidebar.innerHTML = '';

    if (!currentProjectDir) return;

    const fichiers = getAllFiles(currentProjectDir);

    fichiers.forEach(cheminComplet => {
        const div = document.createElement('div');
        div.innerText = path.relative(currentProjectDir, cheminComplet);
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #ccc';
        div.style.fontSize = '12px';

        div.onmouseover = () => div.style.backgroundColor = '#e0e0e0';
        div.onmouseout = () => div.style.backgroundColor = 'transparent';

        div.onclick = () => ouvrirFichier(cheminComplet);

        sidebar.appendChild(div);
    });
}

// --- 3. OUVERTURE ET AFFICHAGE ---
function ouvrirFichier(chemin) {
    currentFilePath = chemin;
    const contenuBrut = fs.readFileSync(chemin, 'utf8');
    const parsed = matter(contenuBrut);
    genererFormulaire(parsed.data, parsed.content);
}

function genererFormulaire(frontMatter, markdownContent) {
    const container = document.getElementById('form-container');
    container.innerHTML = '';

    const keysToSave = [];

    for (const key in frontMatter) {
        if (frontMatter[key] === null) continue;

        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        const label = document.createElement('label');
        label.innerText = key.toUpperCase();
        wrapper.appendChild(label);

        let input;
        const valeur = frontMatter[key];

        if (typeof valeur === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = valeur;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            if (Array.isArray(valeur)) {
                input.value = valeur.join(', ');
            } else {
                input.value = String(valeur);
            }
        }

        input.id = `field-${key}`;
        keysToSave.push(key);

        wrapper.appendChild(input);
        container.appendChild(wrapper);
    }
    
    const premierChamp = container.querySelector('input, textarea');
    if (premierChamp) {
        setTimeout(() => premierChamp.focus(), 50);
    }

    container.dataset.keys = JSON.stringify(keysToSave);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'form-group';
    contentWrapper.innerHTML = '<label>CONTENU (Markdown)</label>';

    const textarea = document.createElement('textarea');
    textarea.id = 'field-content';
    textarea.value = markdownContent;

    contentWrapper.appendChild(textarea);
    container.appendChild(contentWrapper);
}

// --- 4. SAUVEGARDE ---
function sauvegarder() {
    if (!currentFilePath) return;

    const keys = JSON.parse(document.getElementById('form-container').dataset.keys);
    const newConfig = {};

    keys.forEach(key => {
        const input = document.getElementById(`field-${key}`);
        if (input.type === 'checkbox') {
            newConfig[key] = input.checked;
        } else if (input.value.includes(',')) {
            newConfig[key] = input.value.split(',').map(s => s.trim());
        } else {
            newConfig[key] = input.value;
        }
    });

    const newContent = document.getElementById('field-content').value;
    const fileString = matter.stringify(newContent, newConfig);

    try {
        fs.writeFileSync(currentFilePath, fileString);
        console.log("Sauvegardé !");
        
        const btnSave = document.querySelector('.btn');
        const oldText = btnSave.innerText;
        btnSave.innerText = "✅ Enregistré !";
        btnSave.style.background = "green";
        setTimeout(() => {
            btnSave.innerText = oldText;
            btnSave.style.background = "#007bff";
        }, 1000);
        
    } catch (e) {
        console.error(e);
    }
}

// --- 5. LANCEMENT ZOLA (CORRIGÉ) ---
function lancerZola() {
    if (!currentProjectDir) {
        alert("Veuillez d'abord charger un projet !");
        return;
    }

    // On réinitialise le flag : on commence un nouveau lancement
    arretVolontaire = false;

    const btnLaunch = document.getElementById('btn-launch');
    const originalText = btnLaunch.innerText;
    btnLaunch.innerText = "⏳ Nettoyage...";

    // ÉTAPE 1 : On nettoie tout (Taskkill préventif)
    exec('taskkill /IM zola.exe /F', (err) => {
        
        setTimeout(() => {
            console.log("Démarrage du nouveau Zola...");
            
            let commande = 'zola serve';
            if (process.platform === 'win32') {
                const userHome = process.env.USERPROFILE || 'C:\\';
                const wingetPath = path.join(userHome, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'getzola.zola_Microsoft.Winget.Source_8wekyb3d8bbwe', 'zola.exe');
                if (fs.existsSync(wingetPath)) commande = `"${wingetPath}" serve`;
            }

            processusZola = exec(commande, { cwd: currentProjectDir }, (error, stdout, stderr) => {
                // IMPORTANT : On affiche l'erreur SEULEMENT si ce n'est pas un arrêt volontaire
                if (error && !error.killed && !arretVolontaire) {
                    console.error("Crash Zola :", error);
                    alert(`Erreur Zola :\n${stderr || error.message}`);
                    arreterZola(); // On nettoie l'interface
                }
            });

            // Interface
            document.getElementById('btn-launch').style.display = 'none';
            document.getElementById('btn-stop').style.display = 'block';
            btnLaunch.innerText = originalText;

            // Navigateur
            setTimeout(() => {
                if (processusZola && !arretVolontaire) {
                    shell.openExternal('http://127.0.0.1:1111');
                }
            }, 2000);

        }, 500); 
    });
}

// --- 6. ARRÊT ZOLA (CORRIGÉ) ---
function arreterZola() {
    // On signale que c'est nous qui arrêtons (pour empêcher l'alerte d'erreur)
    arretVolontaire = true;

    // On tue tout ce qui s'appelle Zola brutalement
    exec('taskkill /IM zola.exe /F', (err) => {
        if(!err) console.log("Zola tué avec succès.");
    });

    processusZola = null;

    // Interface
    const btnLaunch = document.getElementById('btn-launch');
    const btnStop = document.getElementById('btn-stop');

    if (btnLaunch && btnStop) {
        btnStop.style.display = 'none';
        btnLaunch.style.display = 'block';
        btnLaunch.innerText = "▶️ Prévisualiser le site";
    }
}

// --- 7. GÉNÉRATION (Le système de fenêtre) ---

// A. Cette fonction ouvre juste la fenêtre
function genererSite() {
    if (!currentProjectDir) {
        alert("Veuillez d'abord charger un projet !");
        return;
    }
    // On affiche la fenêtre HTML
    document.getElementById('custom-prompt').classList.add('visible');
    // On met le focus dans le champ texte pour taper direct
    document.getElementById('prompt-input').focus();
}

// B. Cette fonction ferme la fenêtre (Annuler)
function fermerPrompt() {
    document.getElementById('custom-prompt').classList.remove('visible');
    document.getElementById('prompt-input').value = ''; // On vide le champ
}

// C. LA VRAIE FONCTION DE TRAVAIL (Corrigée avec __dirname)
function confirmerGeneration() {
    // 1. Récupérer le nom
    const nomDossier = document.getElementById('prompt-input').value;

    if (!nomDossier || nomDossier.trim() === "") {
        alert("Le nom ne peut pas être vide !");
        return;
    }

    fermerPrompt();

    // 2. Nettoyage du nom
    const nomNettoye = nomDossier.replace(/[^a-zA-Z0-9-_]/g, '_');

    // 3. DÉFINITION DES CHEMINS (C'est ici la correction !)
    // __dirname = Le dossier où se trouve ce fichier renderer.js (donc la racine de ton app)
    // Cela créera : .../app/app/rendu_genere/ton-site
    const dossierExportsRacine = path.join(__dirname, 'rendu_genere');
    const dossierSortie = path.join(dossierExportsRacine, nomNettoye);

    // 4. Vérifications
    
    // a) Création du dossier racine 'rendu_genere' s'il n'existe pas
    if (!fs.existsSync(dossierExportsRacine)) {
        try {
            fs.mkdirSync(dossierExportsRacine);
        } catch (e) {
            alert(`Impossible de créer le dossier : ${dossierExportsRacine}\nErreur : ${e.message}`);
            return;
        }
    }

    // b) Anti-Doublon
    if (fs.existsSync(dossierSortie)) {
        alert(`⚠️ Attention : Le dossier "${nomNettoye}" existe déjà dans "rendu_genere".\nChoisissez un autre nom.`);
        genererSite(); 
        return;
    }

    // --- Lancement de Zola ---
    const btn = document.querySelector('button[onclick="genererSite()"]');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Génération...";

    console.log(`Génération vers : ${dossierSortie}`);

    let zolaExe = 'zola'; 
    if (process.platform === 'win32') {
        const userHome = process.env.USERPROFILE || 'C:\\';
        const wingetPath = path.join(userHome, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'getzola.zola_Microsoft.Winget.Source_8wekyb3d8bbwe', 'zola.exe');
        if (fs.existsSync(wingetPath)) zolaExe = `"${wingetPath}"`;
    }

    const commande = `${zolaExe} build --output-dir "${dossierSortie}"`;

    exec(commande, { cwd: currentProjectDir }, (error, stdout, stderr) => {
        btn.innerText = oldText;

        if (error) {
            console.error("Erreur Build :", error);
            alert(`Erreur lors de la génération :\n${stderr || error.message}`);
            return;
        }

        const reponse = confirm(`✅ Site généré dans :\n${dossierSortie}\n\nVoulez-vous ouvrir le dossier ?`);
        if (reponse) {
            shell.openPath(dossierSortie);
        }
    });
}