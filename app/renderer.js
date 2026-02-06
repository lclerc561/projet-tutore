const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const toml = require('@iarna/toml');
const { ipcRenderer, shell } = require('electron');
const { exec } = require('child_process');
const { validerFormulaire } = require('./validators.js');

let currentProjectDir = null;
let currentFilePath = null;
let processusZola = null;
let arretVolontaire = false;
let formatActuel = 'yaml'; // Pour se souvenir si c'était +++ ou ---

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

    let parsed;

    // DÉTECTION INTELLIGENTE
    if (contenuBrut.trim().startsWith('+++')) {
        // C'est du TOML (Zola par défaut)
        console.log("Format détecté : TOML (+++)");
        formatActuel = 'toml';
        
        parsed = matter(contenuBrut, {
            engines: { toml: toml.parse.bind(toml) },
            language: 'toml',
            delimiters: '+++'
        });
    } else {
        // C'est du YAML (Standard Markdown)
        console.log("Format détecté : YAML (---)");
        formatActuel = 'yaml';
        parsed = matter(contenuBrut);
    }

    genererFormulaire(parsed.data, parsed.content);
}

// --- FONCTION D'IMPORT D'IMAGE ---
async function importerImage(inputId, imgPreviewId) {
    if (!currentProjectDir) return;
    const cheminSource = await ipcRenderer.invoke('dialog:openImage');
    if (!cheminSource) return;

    const dossierImages = path.join(currentProjectDir, 'static', 'images');
    if (!fs.existsSync(dossierImages)) fs.mkdirSync(dossierImages, { recursive: true });

    const nomFichier = path.basename(cheminSource);
    const cheminDestination = path.join(dossierImages, nomFichier);

    try {
        fs.copyFileSync(cheminSource, cheminDestination);
        const cheminRelatifZola = `/images/${nomFichier}`;
        document.getElementById(inputId).value = cheminRelatifZola;
        
        const imgPreview = document.getElementById(imgPreviewId);
        if (imgPreview) {
            imgPreview.src = `file://${cheminDestination}`; 
            imgPreview.style.display = 'block';
        }
        console.log(`Image copiée vers : ${cheminDestination}`);
    } catch (error) {
        alert("Erreur copie image : " + error.message);
    }
}

// --- FONCTION D'IMPORT DE VIDÉO ---
async function importerVideo(inputId, vidPreviewId) {
    if (!currentProjectDir) return;

    const cheminSource = await ipcRenderer.invoke('dialog:openVideo');
    if (!cheminSource) return;

    const dossierVideos = path.join(currentProjectDir, 'static', 'videos');
    if (!fs.existsSync(dossierVideos)) fs.mkdirSync(dossierVideos, { recursive: true });

    const nomFichier = path.basename(cheminSource);
    const cheminDestination = path.join(dossierVideos, nomFichier);

    try {
        fs.copyFileSync(cheminSource, cheminDestination);
        const cheminRelatifZola = `/videos/${nomFichier}`;
        document.getElementById(inputId).value = cheminRelatifZola;
        
        const vidPreview = document.getElementById(vidPreviewId);
        if (vidPreview) {
            vidPreview.src = `file://${cheminDestination}`; 
            vidPreview.style.display = 'block';
        }
        console.log(`Vidéo copiée vers : ${cheminDestination}`);
    } catch (error) {
        alert("Erreur copie vidéo : " + error.message);
    }
}

// --- GÉNÉRATION DU FORMULAIRE ---
function genererFormulaire(frontMatter, markdownContent) {
    const container = document.getElementById('form-container');
    container.innerHTML = '';
    const schema = [];

    function creerChamp(key, valeur, context) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';
        
        const label = document.createElement('label');
        label.innerText = (context === 'extra' ? 'EXTRA > ' : '') + key.toUpperCase();
        if (context === 'extra') label.style.color = '#6f42c1'; 
        wrapper.appendChild(label);

        const inputId = `field-${context}-${key}`;
        const previewId = `preview-${context}-${key}`;

        // --- DÉTECTION TYPE ---
        const lowerKey = key.toLowerCase();
        
        // 1. Est-ce une IMAGE ?
        const isImageField = lowerKey.match(/image|img|icon|logo|cover|hero/) || 
                             (typeof valeur === 'string' && valeur.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));

        // 2. Est-ce une VIDÉO ?
        const isVideoField = lowerKey.match(/video|vid|movie/) || 
                             (typeof valeur === 'string' && valeur.match(/\.(mp4|webm|ogg|mov|mkv)$/i));

        let input;

        if (isVideoField) {
            // === C'EST UNE VIDÉO ===
            const vidContainer = document.createElement('div');
            vidContainer.style.border = '1px dashed #ccc';
            vidContainer.style.padding = '10px';
            vidContainer.style.background = '#e2e6ea';
            vidContainer.style.borderRadius = '5px';

            const videoPreview = document.createElement('video');
            videoPreview.id = previewId;
            videoPreview.controls = true;
            videoPreview.style.maxWidth = '100%';
            videoPreview.style.maxHeight = '200px';
            videoPreview.style.marginBottom = '10px';
            videoPreview.style.display = 'none';

            if (valeur && typeof valeur === 'string') {
                let cheminLocal = valeur;
                if (valeur.startsWith('/')) {
                    cheminLocal = path.join(currentProjectDir, 'static', valeur);
                }
                if (fs.existsSync(cheminLocal)) {
                    videoPreview.src = `file://${cheminLocal}`;
                    videoPreview.style.display = 'block';
                }
            }
            vidContainer.appendChild(videoPreview);

            input = document.createElement('input');
            input.type = 'text';
            input.value = String(valeur || '');
            input.id = inputId;
            input.style.marginBottom = '10px';
            vidContainer.appendChild(input);

            const btnImport = document.createElement('button');
            btnImport.innerText = "🎬 Changer la vidéo";
            btnImport.style.cursor = 'pointer';
            btnImport.style.padding = '5px 10px';
            btnImport.style.background = '#6f42c1';
            btnImport.style.color = 'white';
            btnImport.style.border = 'none';
            btnImport.style.borderRadius = '3px';
            
            btnImport.onclick = (e) => {
                e.preventDefault();
                importerVideo(inputId, previewId);
            };

            vidContainer.appendChild(btnImport);
            wrapper.appendChild(vidContainer);

        } else if (isImageField) {
            // === C'EST UNE IMAGE ===
            const imgContainer = document.createElement('div');
            imgContainer.style.border = '1px dashed #ccc';
            imgContainer.style.padding = '10px';
            imgContainer.style.background = '#f9f9f9';
            imgContainer.style.borderRadius = '5px';

            const imgPreview = document.createElement('img');
            imgPreview.id = previewId;
            imgPreview.style.maxWidth = '100%';
            imgPreview.style.maxHeight = '200px';
            imgPreview.style.marginBottom = '10px';
            imgPreview.style.display = 'none';

            if (valeur && typeof valeur === 'string') {
                let cheminLocal = valeur;
                if (valeur.startsWith('/')) {
                    cheminLocal = path.join(currentProjectDir, 'static', valeur);
                }
                if (fs.existsSync(cheminLocal)) {
                    imgPreview.src = `file://${cheminLocal}`;
                    imgPreview.style.display = 'block';
                }
            }
            imgContainer.appendChild(imgPreview);

            input = document.createElement('input');
            input.type = 'text';
            input.value = String(valeur || '');
            input.id = inputId;
            input.style.marginBottom = '10px';
            imgContainer.appendChild(input);

            const btnImport = document.createElement('button');
            btnImport.innerText = "🖼️ Changer l'image";
            btnImport.style.cursor = 'pointer';
            btnImport.style.padding = '5px 10px';
            btnImport.style.background = '#17a2b8';
            btnImport.style.color = 'white';
            btnImport.style.border = 'none';
            btnImport.style.borderRadius = '3px';
            
            btnImport.onclick = (e) => {
                e.preventDefault();
                importerImage(inputId, previewId);
            };

            imgContainer.appendChild(btnImport);
            wrapper.appendChild(imgContainer);

        } else if (typeof valeur === 'boolean') {
            // Gestion des booléens
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = valeur;
            input.id = inputId;
            wrapper.appendChild(input);
        } else {
            // Gestion des champs texte et nombres
            input = document.createElement('input');
            input.type = 'text';
            
            if (valeur instanceof Date) {
                try {
                    input.value = valeur.toISOString().split('T')[0];
                } catch (e) {
                    input.value = String(valeur);
                }
            } else if (Array.isArray(valeur)) {
                input.value = valeur.join(', ');
            } else {
                input.value = String(valeur);
            }
            input.id = inputId;
            wrapper.appendChild(input);
        }

        container.appendChild(wrapper);
        schema.push({ key: key, context: context });
    }

    // Boucle principale
    for (const key in frontMatter) {
        const value = frontMatter[key];
        // Support récursif pour [extra]
        if (key === 'extra' && typeof value === 'object' && value !== null) {
            for (const subKey in value) {
                creerChamp(subKey, value[subKey], 'extra');
            }
        } else if (value !== null) {
            creerChamp(key, value, 'root');
        }
    }
    
    const premierChamp = container.querySelector('input, textarea');
    if (premierChamp) setTimeout(() => premierChamp.focus(), 50);

    container.dataset.schema = JSON.stringify(schema);

    // Ajout de la zone de contenu (Markdown)
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'form-group';
    contentWrapper.innerHTML = '<label>CONTENU (Markdown)</label>';
    const textarea = document.createElement('textarea');
    textarea.id = 'field-content';
    textarea.value = markdownContent;
    contentWrapper.appendChild(textarea);
    container.appendChild(contentWrapper);
}

// --- FONCTION UTILITAIRE POUR AFFICHER LES MESSAGES SANS ALERT ---
function afficherMessage(texte, estErreur) {
    const msgDiv = document.getElementById('status-message');
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
        setTimeout(() => {
            msgDiv.style.display = 'none';
        }, 3000);
    }
}

// --- 4. SAUVEGARDE SANS PERTE DE FOCUS ---
function sauvegarder() {
    if (!currentFilePath) return;

    // 1. Récupération des données via le schéma
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

        // Si c'est une variable 'extra', on la range dans l'objet extra
        if (item.context === 'extra') {
            if (!newConfig.extra) newConfig.extra = {};
            newConfig.extra[item.key] = val;
        } else {
            newConfig[item.key] = val;
        }
    });

    // 2. VALIDATION
    const validation = validerFormulaire(newConfig);

    if (!validation.isValid) {
        afficherMessage("⚠️ " + validation.error, true);
        return; 
    }

    // 3. Écriture du fichier
    const newContent = document.getElementById('field-content').value;
    let fileString;

    try {
        if (formatActuel === 'toml') {
            fileString = matter.stringify(newContent, newConfig, {
                engines: { toml: toml },
                language: 'toml',
                delimiters: '+++'
            });
        } else {
            fileString = matter.stringify(newContent, newConfig);
        }

        fs.writeFileSync(currentFilePath, fileString);
        console.log(`Sauvegardé en format ${formatActuel} !`);
        
        ouvrirFichier(currentFilePath); 
        afficherMessage("✅ Sauvegarde réussie !", false);
        
    } catch (e) {
        console.error(e);
        afficherMessage("Erreur technique : " + e.message, true);
    }
}

// --- 5. LANCEMENT ZOLA ---
function lancerZola() {
    if (!currentProjectDir) {
        alert("Veuillez d'abord charger un projet !");
        return;
    }

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
                if (error && !error.killed && !arretVolontaire) {
                    console.error("Crash Zola :", error);
                    alert(`Erreur Zola :\n${stderr || error.message}`);
                    arreterZola(); 
                }
            });

            document.getElementById('btn-launch').style.display = 'none';
            document.getElementById('btn-stop').style.display = 'block';
            btnLaunch.innerText = originalText;

            setTimeout(() => {
                if (processusZola && !arretVolontaire) {
                    shell.openExternal('http://127.0.0.1:1111');
                }
            }, 2000);

        }, 500); 
    });
}

// --- 6. ARRÊT ZOLA ---
function arreterZola() {
    arretVolontaire = true;

    exec('taskkill /IM zola.exe /F', (err) => {
        if(!err) console.log("Zola tué avec succès.");
    });

    processusZola = null;

    const btnLaunch = document.getElementById('btn-launch');
    const btnStop = document.getElementById('btn-stop');

    if (btnLaunch && btnStop) {
        btnStop.style.display = 'none';
        btnLaunch.style.display = 'block';
        btnLaunch.innerText = "▶️ Prévisualiser le site";
    }
}

// --- 7. GÉNÉRATION ---

function genererSite() {
    if (!currentProjectDir) {
        alert("Veuillez d'abord charger un projet !");
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
        alert("Le nom ne peut pas être vide !");
        return;
    }

    fermerPrompt();

    const nomNettoye = nomDossier.replace(/[^a-zA-Z0-9-_]/g, '_');
    const dossierExportsRacine = path.join(__dirname, 'rendu_genere');
    const dossierSortie = path.join(dossierExportsRacine, nomNettoye);

    if (!fs.existsSync(dossierExportsRacine)) {
        try {
            fs.mkdirSync(dossierExportsRacine);
        } catch (e) {
            alert(`Impossible de créer le dossier : ${dossierExportsRacine}\nErreur : ${e.message}`);
            return;
        }
    }

    if (fs.existsSync(dossierSortie)) {
        alert(`⚠️ Attention : Le dossier "${nomNettoye}" existe déjà dans "rendu_genere".\nChoisissez un autre nom.`);
        genererSite(); 
        return;
    }

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