const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { ipcRenderer } = require('electron');

const {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst,
    insertParagraphAst
} = require('./markdownAst');

let currentProjectDir = null;
let currentFilePath = null;
let currentAst = null;

/* ===============================
   FOCUS FIX (Electron)
================================ */
window.addEventListener('click', () => {
    if (
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA'
    ) {
        window.focus();
    }
});

/* ===============================
   1. CHARGER UN PROJET
================================ */
async function choisirDossier() {
    const cheminDossier = await ipcRenderer.invoke('dialog:openDirectory');
    if (!cheminDossier) return;

    currentProjectDir = cheminDossier;
    chargerListeFichiers();

    const btn = document.querySelector('button');
    if (btn) btn.innerText = '📂 Projet chargé !';

    console.log('Projet chargé :', currentProjectDir);
}

/* ===============================
   2. LISTER LES FICHIERS MD
================================ */
function getAllFiles(dirPath, files = []) {
    fs.readdirSync(dirPath).forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, files);
        } else if (file.endsWith('.md')) {
            files.push(fullPath);
        }
    });
    return files;
}

function chargerListeFichiers() {
    const sidebar = document.getElementById('file-list');
    sidebar.innerHTML = '';

    if (!currentProjectDir) return;

    const fichiers = getAllFiles(currentProjectDir);

    fichiers.forEach(filePath => {
        const div = document.createElement('div');
        div.innerText = path.relative(currentProjectDir, filePath);
        div.style.padding = '10px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #ccc';
        div.style.fontSize = '12px';

        div.onmouseover = () => (div.style.backgroundColor = '#e0e0e0');
        div.onmouseout = () => (div.style.backgroundColor = 'transparent');
        div.onclick = () => ouvrirFichier(filePath);

        sidebar.appendChild(div);
    });
}

/* ===============================
   3. OUVRIR UN FICHIER
================================ */
function ouvrirFichier(filePath) {
    currentFilePath = filePath;

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(raw);

    genererFormulaire(parsed.data, parsed.content);
}

/* ===============================
   4. GÉNÉRER L'ÉDITEUR
================================ */
function genererFormulaire(frontMatter, markdownContent) {
    const container = document.getElementById('form-container');
    container.innerHTML = '';

    /* ---------- Front-matter ---------- */
    const keysToSave = [];

    Object.keys(frontMatter).forEach(key => {
        if (frontMatter[key] === null) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        const label = document.createElement('label');
        label.innerText = key.toUpperCase();
        wrapper.appendChild(label);

        const input = document.createElement('input');
        input.type = typeof frontMatter[key] === 'boolean' ? 'checkbox' : 'text';

        if (input.type === 'checkbox') {
            input.checked = frontMatter[key];
        } else if (Array.isArray(frontMatter[key])) {
            input.value = frontMatter[key].join(', ');
        } else {
            input.value = String(frontMatter[key]);
        }

        input.id = `field-${key}`;
        keysToSave.push(key);

        wrapper.appendChild(input);
        container.appendChild(wrapper);
    });

    container.dataset.keys = JSON.stringify(keysToSave);

    /* ---------- AST init ---------- */
    currentAst = parseMarkdownToAst(markdownContent);

    /* ---------- AJOUT TITRE ---------- */
    const headingWrapper = document.createElement('div');
    headingWrapper.className = 'form-group';
    headingWrapper.innerHTML = `
        <label>Ajouter un titre</label>
        <select id="heading-level">
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
        </select>
        <input type="text" id="heading-text" placeholder="Texte du titre">
        <button type="button">➕ Ajouter le titre</button>
    `;

    headingWrapper.querySelector('button').onclick = () => {
        const level = parseInt(
            document.getElementById('heading-level').value,
            10
        );
        const text = document.getElementById('heading-text').value.trim();
        if (!text) return alert('Le titre ne peut pas être vide');

        currentAst = parseMarkdownToAst(textarea.value);
        insertHeadingAst(currentAst, level, text);
        textarea.value = astToMarkdown(currentAst);

        document.getElementById('heading-text').value = '';
    };

    container.appendChild(headingWrapper);

    /* ---------- AJOUT PARAGRAPHE ---------- */
    const paragraphWrapper = document.createElement('div');
    paragraphWrapper.className = 'form-group';
    paragraphWrapper.innerHTML = `
        <label>Ajouter un paragraphe</label>
        <textarea id="paragraph-text" placeholder="Texte du paragraphe"></textarea>
        <button type="button">➕ Ajouter le paragraphe</button>
    `;

    paragraphWrapper.querySelector('button').onclick = () => {
        const text = document.getElementById('paragraph-text').value.trim();
        if (!text) return alert('Le paragraphe ne peut pas être vide');

        currentAst = parseMarkdownToAst(textarea.value);
        insertParagraphAst(currentAst, text);
        textarea.value = astToMarkdown(currentAst);

        document.getElementById('paragraph-text').value = '';
    };

    container.appendChild(paragraphWrapper);

    /* ---------- CONTENU MARKDOWN ---------- */
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'form-group';
    contentWrapper.innerHTML = '<label>CONTENU (Markdown)</label>';

    const textarea = document.createElement('textarea');
    textarea.id = 'field-content';
    textarea.value = markdownContent;

    contentWrapper.appendChild(textarea);
    container.appendChild(contentWrapper);

    setTimeout(() => textarea.focus(), 50);
}

/* ===============================
   5. SAUVEGARDE
================================ */
function sauvegarder() {
    if (!currentFilePath) return;

    const keys = JSON.parse(
        document.getElementById('form-container').dataset.keys
    );

    const newConfig = {};
    keys.forEach(key => {
        const input = document.getElementById(`field-${key}`);
        if (input.type === 'checkbox') {
            newConfig[key] = input.checked;
        } else if (input.value.includes(',')) {
            newConfig[key] = input.value.split(',').map(v => v.trim());
        } else {
            newConfig[key] = input.value;
        }
    });

    const content = document.getElementById('field-content').value;
    const fileString = matter.stringify(content, newConfig);

    fs.writeFileSync(currentFilePath, fileString);

    const btn = document.querySelector('.btn');
    const old = btn.innerText;
    btn.innerText = '✅ Enregistré !';
    btn.style.background = 'green';

    setTimeout(() => {
        btn.innerText = old;
        btn.style.background = '#007bff';
    }, 1000);
}

/* ===============================
   EXPOSER AU HTML
================================ */
window.choisirDossier = choisirDossier;
window.sauvegarder = sauvegarder;
