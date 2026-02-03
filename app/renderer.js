// renderer.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { ipcRenderer } = require('electron');
const {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst
} = require('./markdownAst');

let currentProjectDir = null;
let currentFilePath = null;
let currentAst = null;

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

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.md')) {
            arrayOfFiles.push(fullPath);
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
    if (premierChamp) setTimeout(() => premierChamp.focus(), 50);

    container.dataset.keys = JSON.stringify(keysToSave);

    // --- Contenu Markdown ---
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'form-group';
    contentWrapper.innerHTML = '<label>CONTENU (Markdown)</label>';

    const textarea = document.createElement('textarea');
    textarea.id = 'field-content';
    textarea.value = markdownContent;
    contentWrapper.appendChild(textarea);
    container.appendChild(contentWrapper);

    // --- AST ---
    currentAst = parseMarkdownToAst(markdownContent);

    // --- UI Ajouter un titre ---
    const headingWrapper = document.createElement('div');
    headingWrapper.className = 'form-group';
    headingWrapper.innerHTML = `
        <label>Ajouter un titre (H2 min)</label>
        <select id="heading-level">
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
        </select>
        <input type="text" id="heading-text" placeholder="Texte du titre" style="margin-top:5px;">
        <button type="button" style="margin-top:5px;">➕ Ajouter le titre</button>
    `;
    const btnAdd = headingWrapper.querySelector('button');
    btnAdd.onclick = () => {
        const level = parseInt(document.getElementById('heading-level').value, 10);
        const text = document.getElementById('heading-text').value.trim();
        if (!text) return alert("Le titre ne peut pas être vide");

        // Resync AST avec le contenu actuel
        currentAst = parseMarkdownToAst(textarea.value);
        insertHeadingAst(currentAst, level, text);

        textarea.value = astToMarkdown(currentAst);
        document.getElementById('heading-text').value = '';
    };
    container.appendChild(headingWrapper);
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

// Exposer les fonctions globalement pour HTML
window.choisirDossier = choisirDossier;
window.sauvegarder = sauvegarder;
