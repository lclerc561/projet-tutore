const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { ipcRenderer } = require('electron');

let currentProjectDir = null;
let currentFilePath = null;

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
    
    //Attent le chargement avant de focus pour éviter les bugs
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