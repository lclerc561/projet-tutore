const path = require('path');

// ============================================================
// 0. CONFIGURATION ZOLA (Champs Officiels)
// ============================================================
const ZOLA_DEFAULTS = {
    title: { type: 'text', label: 'Titre' },
    description: { type: 'text', label: 'Description' },
    date: { type: 'date', label: 'Date' },
    weight: { type: 'number', label: 'Poids (Ordre)' },
    draft: { type: 'boolean', label: 'Brouillon (Draft)' },
    slug: { type: 'text', label: 'Slug (URL)' },
    path: { type: 'text', label: 'Chemin (Path)' },
    aliases: { type: 'list', label: 'Redirections (Aliases)' },
    in_search_index: { type: 'boolean', label: 'Indexable' },
    template: { type: 'text', label: 'Template (.html)' },
    taxonomies: { type: 'list', label: 'Taxonomies (Tags/Catégories)' }
};

// ============================================================
// 1. UTILITAIRES DE SCHEMA
// ============================================================

function updateSchema(container, key, context) {
    let schema = [];
    try { schema = JSON.parse(container.dataset.schema || '[]'); } catch (e) { }

    const index = schema.findIndex(i => i.key === key && i.context === context);
    if (index !== -1) {
        schema[index] = { key, context };
    } else {
        schema.push({ key, context });
    }
    container.dataset.schema = JSON.stringify(schema);
}

function removeFromSchema(container, key, context) {
    let schema = [];
    try { schema = JSON.parse(container.dataset.schema || '[]'); } catch (e) { }
    const newSchema = schema.filter(i => !(i.key === key && i.context === context));
    container.dataset.schema = JSON.stringify(newSchema);
}

// ============================================================
// 2. CRÉATION DES CHAMPS (INPUTS)
// ============================================================

function createInputElement(key, value, context, callbacks, projectDir, container, forcedType = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';
    wrapper.style.marginBottom = '15px';
    wrapper.style.padding = '12px';
    wrapper.style.border = '1px solid #e0e0e0';
    wrapper.style.borderRadius = '6px';
    wrapper.style.backgroundColor = '#fff';
    wrapper.style.position = 'relative';

    // Couleur de bordure
    if (context === 'extra') {
        wrapper.style.borderLeft = '4px solid #6f42c1'; // Violet
    } else {
        wrapper.style.borderLeft = '4px solid #2c3e50'; // Bleu
    }

    wrapper.dataset.key = key;

    // --- EN-TÊTE ---
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.marginBottom = '8px';

    const label = document.createElement('label');
    label.innerText = key.toUpperCase();
    label.style.fontWeight = '700';
    label.style.fontSize = '0.85em';
    label.style.color = '#333';
    headerDiv.appendChild(label);

    // Bouton Supprimer
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '✖';
    deleteBtn.title = "Supprimer";
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.color = '#dc3545';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.fontSize = '1.1em';
    deleteBtn.onclick = () => {
        wrapper.remove();
        removeFromSchema(container, key, context);
    };
    headerDiv.appendChild(deleteBtn);
    wrapper.appendChild(headerDiv);

    // --- DÉTECTION DU TYPE ---
    const inputId = `field-${context}-${key}`;
    const previewId = `preview-${context}-${key}`;
    const lowerKey = key.toLowerCase();

    // Priorité : 1. Type forcé (nouveau), 2. Définition Zola (officiel), 3. Détection auto (existant)
    let finalType = 'text';

    if (forcedType) {
        finalType = forcedType;
    } else if (context === 'root' && ZOLA_DEFAULTS[lowerKey]) {
        // Mapping automatique des types officiels si non spécifié
        const zolaType = ZOLA_DEFAULTS[lowerKey].type;
        if (zolaType === 'number') finalType = 'text'; // On utilise text pour number pour l'instant
        else finalType = zolaType;
    } else {
        // Détection auto
        if (lowerKey.match(/image|img|icon|logo|cover|hero/) || (typeof value === 'string' && value.match(/\.(jpg|png|gif|svg|webp)$/i))) finalType = 'image';
        else if (lowerKey.match(/video|vid|movie/) || (typeof value === 'string' && value.match(/\.(mp4|webm|mov|mkv)$/i))) finalType = 'video';
        else if (typeof value === 'boolean') finalType = 'boolean';
        else if (Array.isArray(value)) finalType = 'list';
        else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/))) finalType = 'date';
    }

    // --- RENDU ---

    if (finalType === 'image' || finalType === 'video') {
        const isVideo = finalType === 'video';
        const mediaBox = document.createElement('div');
        mediaBox.style.background = '#f8f9fa'; mediaBox.style.padding = '10px'; mediaBox.style.borderRadius = '5px';

        const mediaPreview = document.createElement(isVideo ? 'video' : 'img');
        mediaPreview.id = previewId;
        mediaPreview.style.maxWidth = '100%'; mediaPreview.style.maxHeight = '150px'; mediaPreview.style.marginBottom = '10px'; mediaPreview.style.display = 'none';
        if (isVideo) mediaPreview.controls = true;

        if (value && typeof value === 'string') {
            if (value.startsWith('/') && projectDir) {
                const cleanPath = value.substring(1);
                const fullPath = path.join(projectDir, 'static', cleanPath);
                mediaPreview.src = `file://${fullPath}`;
            } else { mediaPreview.src = value; }
            mediaPreview.style.display = 'block';
        }
        mediaBox.appendChild(mediaPreview);

        const input = document.createElement('input');
        input.type = 'text'; input.value = value || ''; input.id = inputId; input.className = 'form-control';
        input.style.width = '100%'; input.style.marginBottom = '8px';
        mediaBox.appendChild(input);

        const btn = document.createElement('button');
        btn.innerText = isVideo ? "🎬 Choisir Vidéo" : "🖼️ Choisir Image";
        btn.className = 'btn'; btn.style.background = isVideo ? '#6f42c1' : '#17a2b8'; btn.style.color = 'white'; btn.style.fontSize = '0.8em'; btn.style.padding = '5px 10px';
        btn.onclick = (e) => {
            e.preventDefault();
            if (isVideo) callbacks.onImportVideo(inputId, previewId);
            else callbacks.onImportImage(inputId, previewId);
        };
        mediaBox.appendChild(btn);
        wrapper.appendChild(mediaBox);

    } else if (finalType === 'boolean') {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value === true || value === 'true';
        input.id = inputId;
        input.style.transform = "scale(1.5)";
        input.style.marginLeft = "5px";

        const labelRow = document.createElement('div');
        labelRow.style.display = 'flex'; labelRow.style.alignItems = 'center';
        labelRow.appendChild(input);

        const statusLabel = document.createElement('span');
        statusLabel.innerText = input.checked ? " Vrai (True)" : " Faux (False)";
        statusLabel.style.marginLeft = "10px"; statusLabel.style.fontSize = "0.9em";
        labelRow.appendChild(statusLabel);

        input.onchange = () => { statusLabel.innerText = input.checked ? " Vrai (True)" : " Faux (False)"; };
        wrapper.appendChild(labelRow);

    } else if (finalType === 'list') {
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'form-control';
        input.value = Array.isArray(value) ? value.join(', ') : (value || '');
        input.id = inputId; input.style.width = '100%';

        const help = document.createElement('small');
        help.innerHTML = "📝 <b>Liste :</b> séparez par une virgule (ex: <code>chat, chien</code>)";
        help.style.color = '#d35400'; help.style.display = 'block'; help.style.marginTop = '5px';

        wrapper.appendChild(input);
        wrapper.appendChild(help);

    } else if (finalType === 'date') {
        const input = document.createElement('input');
        input.type = 'date';
        input.className = 'form-control';
        try {
            if (value instanceof Date) input.value = value.toISOString().split('T')[0];
            else if (value) input.value = String(value).split('T')[0];
        } catch (e) { }
        input.id = inputId; input.style.width = '100%';
        wrapper.appendChild(input);

    } else {
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'form-control';
        input.value = String(value === null || value === undefined ? '' : value);
        input.id = inputId; input.style.width = '100%';
        wrapper.appendChild(input);
    }

    return wrapper;
}

// ============================================================
// 3. BLOCS DE CONTENU (MD)
// ============================================================
function createBlockElement(node, index, callbacks, projectDir) {
    const wrapper = document.createElement('div');
    wrapper.className = 'block-item';
    wrapper.style.marginBottom = '15px'; wrapper.style.padding = '15px 15px 15px 40px'; wrapper.style.background = 'white'; wrapper.style.border = '1px solid #e0e0e0'; wrapper.style.borderRadius = '8px'; wrapper.style.position = 'relative'; wrapper.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; wrapper.style.transition = 'all 0.2s';

    wrapper.draggable = true;
    const grip = document.createElement('div'); grip.innerHTML = '⋮⋮'; grip.style.position = 'absolute'; grip.style.left = '10px'; grip.style.top = '50%'; grip.style.transform = 'translateY(-50%)'; grip.style.cursor = 'grab'; grip.style.color = '#ccc'; grip.style.fontSize = '20px'; grip.style.fontWeight = 'bold'; grip.style.userSelect = 'none'; wrapper.appendChild(grip);

    wrapper.addEventListener('dragstart', (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', index); wrapper.style.opacity = '0.5'; });
    wrapper.addEventListener('dragend', () => { wrapper.style.opacity = '1'; document.querySelectorAll('.block-item').forEach(el => el.style.borderTop = '1px solid #e0e0e0'); });
    wrapper.addEventListener('dragover', (e) => { e.preventDefault(); wrapper.style.borderTop = '2px solid #3498db'; });
    wrapper.addEventListener('dragleave', () => { wrapper.style.borderTop = '1px solid #e0e0e0'; });
    wrapper.addEventListener('drop', (e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain')); if (from !== index) callbacks.onMoveBlock(from, index); });

    const badge = document.createElement('span'); badge.style.position = 'absolute'; badge.style.top = '-10px'; badge.style.left = '10px'; badge.style.fontSize = '10px'; badge.style.padding = '2px 6px'; badge.style.borderRadius = '4px'; badge.style.color = 'white'; badge.style.fontWeight = 'bold'; badge.style.textTransform = 'uppercase'; wrapper.appendChild(badge);

    const btnDelete = document.createElement('button'); btnDelete.innerHTML = '✖'; btnDelete.style.position = 'absolute'; btnDelete.style.top = '5px'; btnDelete.style.right = '5px'; btnDelete.style.border = 'none'; btnDelete.style.background = 'transparent'; btnDelete.style.color = '#dc3545'; btnDelete.style.cursor = 'pointer'; btnDelete.onclick = () => callbacks.onDeleteBlock(index); wrapper.appendChild(btnDelete);

    const isImageParagraph = (node.type === 'paragraph' && node.children && node.children.length === 1 && node.children[0].type === 'image');

    if (node.type === 'heading') {
        badge.innerText = `H${node.depth}`; badge.style.background = '#3498db';
        let contentValue = node.children.map(c => c.value || '').join('');
        const input = document.createElement('input'); input.type = 'text'; input.value = contentValue; input.style.width = '100%'; input.style.border = 'none'; input.style.outline = 'none'; input.style.fontWeight = 'bold'; input.style.fontSize = (26 - (node.depth * 2)) + 'px'; input.placeholder = "Titre...";
        input.draggable = true; input.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        input.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, false);
        wrapper.appendChild(input);
    } else if (isImageParagraph) {
        badge.innerText = 'IMAGE'; badge.style.background = '#e74c3c';
        const imgNode = node.children[0]; const url = imgNode.url || '';
        const imgContainer = document.createElement('div'); imgContainer.style.textAlign = 'center';
        const preview = document.createElement('img'); preview.style.maxWidth = '100%'; preview.style.maxHeight = '200px'; preview.style.marginBottom = '10px'; preview.style.borderRadius = '4px';
        if (url && url.startsWith('/') && projectDir) { const fullPath = path.join(projectDir, 'static', url.substring(1)); preview.src = `file://${fullPath}`; } else { preview.src = url; }

        const inputId = `block-img-${index}`; const previewId = `block-prev-${index}`; preview.id = previewId; imgContainer.appendChild(preview);
        const inputUrl = document.createElement('input'); inputUrl.type = 'text'; inputUrl.value = url; inputUrl.id = inputId; inputUrl.style.width = '100%'; inputUrl.style.marginBottom = '5px'; inputUrl.placeholder = "Chemin de l'image";
        inputUrl.draggable = true; inputUrl.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        inputUrl.oninput = (e) => { callbacks.onUpdateBlock(index, { url: e.target.value, alt: imgNode.alt }, 'image'); }; imgContainer.appendChild(inputUrl);
        const btnBrowse = document.createElement('button'); btnBrowse.innerText = "📂 Choisir une image"; btnBrowse.style.background = '#e74c3c'; btnBrowse.style.color = 'white'; btnBrowse.style.border = 'none'; btnBrowse.style.padding = '5px 10px'; btnBrowse.style.borderRadius = '3px'; btnBrowse.style.cursor = 'pointer';
        btnBrowse.onclick = (e) => { e.preventDefault(); callbacks.onImportImage(inputId, previewId); }; imgContainer.appendChild(btnBrowse); wrapper.appendChild(imgContainer);
    } else if (node.type === 'paragraph') {
        badge.innerText = 'Texte (MD)'; badge.style.background = '#27ae60';
        const rawMd = callbacks.nodeToMarkdown(node);
        const textarea = document.createElement('textarea'); textarea.value = rawMd; textarea.style.width = '100%'; textarea.style.minHeight = '60px'; textarea.style.border = 'none'; textarea.style.resize = 'vertical'; textarea.style.outline = 'none'; textarea.style.fontFamily = 'inherit';
        textarea.draggable = true; textarea.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        textarea.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'raw'); wrapper.appendChild(textarea);
    } else if (node.type === 'blockquote') {
        badge.innerText = 'Citation'; badge.style.background = '#f1c40f';
        let rawText = ""; if (node.children && node.children.length > 0 && node.children[0].type === 'paragraph') { rawText = node.children[0].children.map(c => c.value).join(''); }
        const area = document.createElement('textarea'); area.value = rawText; area.style.width = '100%'; area.style.minHeight = '60px'; area.style.border = 'none'; area.style.borderLeft = '5px solid #f1c40f'; area.style.padding = '10px'; area.style.backgroundColor = '#fffcf5'; area.style.resize = 'vertical'; area.style.outline = 'none';
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'blockquote'); wrapper.appendChild(area);
    } else if (node.type === 'html' && node.value && node.value.includes('<video')) {
        badge.innerText = 'VIDÉO'; badge.style.background = '#8e44ad';
        const vidContainer = document.createElement('div'); vidContainer.style.textAlign = 'center';
        const srcMatch = node.value.match(/src="([^"]+)"/); const currentSrc = srcMatch ? srcMatch[1] : '';
        const preview = document.createElement('video'); preview.controls = true; preview.style.maxWidth = '100%'; preview.style.maxHeight = '200px'; preview.style.marginBottom = '10px';
        if (currentSrc && currentSrc.startsWith('/') && projectDir) { const fullPath = path.join(projectDir, 'static', currentSrc.substring(1)); preview.src = `file://${fullPath}`; } else { preview.src = currentSrc; }
        const inputId = `block-vid-${index}`; const previewId = `block-vprev-${index}`; preview.id = previewId; vidContainer.appendChild(preview);
        const inputUrl = document.createElement('input'); inputUrl.type = 'text'; inputUrl.value = currentSrc; inputUrl.id = inputId; inputUrl.style.width = '100%'; inputUrl.style.marginBottom = '5px'; inputUrl.placeholder = "Chemin vidéo";
        inputUrl.draggable = true; inputUrl.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        inputUrl.oninput = (e) => { const newSrc = e.target.value; const newHtml = `<video controls src="${newSrc}" width="100%"></video>`; callbacks.onUpdateBlock(index, newHtml, 'video'); }; vidContainer.appendChild(inputUrl);
        const btnBrowse = document.createElement('button'); btnBrowse.innerText = "🎬 Choisir une vidéo"; btnBrowse.style.background = '#8e44ad'; btnBrowse.style.color = 'white'; btnBrowse.style.border = 'none'; btnBrowse.style.padding = '5px 10px'; btnBrowse.style.borderRadius = '3px'; btnBrowse.style.cursor = 'pointer';
        btnBrowse.onclick = (e) => { e.preventDefault(); callbacks.onImportVideo(inputId, previewId); }; vidContainer.appendChild(btnBrowse); wrapper.appendChild(vidContainer);
    } else {
        badge.innerText = node.type === 'code' ? 'CODE' : (node.type === 'list' ? 'LISTE' : node.type.toUpperCase());
        badge.style.background = '#34495e';
        const rawMd = callbacks.nodeToMarkdown(node);
        const area = document.createElement('textarea'); area.value = rawMd; area.style.width = '100%'; area.style.minHeight = '80px'; area.style.border = '1px solid #ddd'; area.style.borderRadius = '4px'; area.style.padding = '10px'; area.style.fontFamily = 'monospace';
        if (node.type === 'code') { area.style.backgroundColor = '#2c3e50'; area.style.color = '#ecf0f1'; }
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'raw'); wrapper.appendChild(area);
    }
    return wrapper;
}

// ============================================================
// 4. GÉNÉRATION GLOBALE
// ============================================================

function generateForm(container, frontMatter, ast, schema, callbacks, projectDir) {
    container.innerHTML = '';
    container.dataset.schema = '[]';

    // Suivi des clés déjà utilisées (pour filtrer la liste)
    const usedKeys = new Set(Object.keys(frontMatter));

    const mainWrapper = document.createElement('div');
    mainWrapper.style.display = 'flex';
    mainWrapper.style.gap = '20px';
    mainWrapper.style.flexWrap = 'wrap';

    // --- COLONNE 1 : RACINE (Standard Zola) ---
    const rootContainer = document.createElement('div');
    rootContainer.style.flex = '1';
    rootContainer.style.minWidth = '300px';
    rootContainer.style.background = '#fff';
    rootContainer.style.padding = '20px';
    rootContainer.style.borderRadius = '8px';
    rootContainer.style.border = '1px solid #ddd';
    rootContainer.innerHTML = '<h3 style="margin-top:0; color:#2c3e50; border-bottom:2px solid #2c3e50; padding-bottom:10px;">⚙️ Paramètres Zola (Racine)</h3>';

    // --- COLONNE 2 : EXTRA (Perso) ---
    const extraContainer = document.createElement('div');
    extraContainer.style.flex = '1';
    extraContainer.style.minWidth = '300px';
    extraContainer.style.background = '#fcfaff';
    extraContainer.style.padding = '20px';
    extraContainer.style.borderRadius = '8px';
    extraContainer.style.border = '1px solid #ddd';
    extraContainer.innerHTML = '<h3 style="margin-top:0; color:#6f42c1; border-bottom:2px solid #6f42c1; padding-bottom:10px;">🎨 Données Personnalisées (Extra)</h3>';

    const fieldsWrapperRoot = document.createElement('div');
    rootContainer.appendChild(fieldsWrapperRoot);

    const fieldsWrapperExtra = document.createElement('div');
    extraContainer.appendChild(fieldsWrapperExtra);

    // Fonction de remplissage initial
    function processFields(obj, context) {
        for (const key in obj) {
            const value = obj[key];
            if (key === 'extra' && typeof value === 'object' && value !== null) {
                // Contenu de Extra
                for (const extraKey in value) {
                    const el = createInputElement(extraKey, value[extraKey], 'extra', callbacks, projectDir, container);
                    fieldsWrapperExtra.appendChild(el);
                    updateSchema(container, extraKey, 'extra');
                }
            } else if (context === 'root') {
                // Contenu Racine
                const el = createInputElement(key, value, 'root', callbacks, projectDir, container);
                fieldsWrapperRoot.appendChild(el);
                updateSchema(container, key, 'root');
            }
        }
    }
    processFields(frontMatter, 'root');

    // --- BOUTON 1 : AJOUTER CHAMP STANDARD (RACINE) ---
    const addStandardBtn = document.createElement('button');
    addStandardBtn.innerHTML = "➕ Ajouter Champ Standard";
    addStandardBtn.className = 'btn';
    addStandardBtn.style.marginTop = '15px';
    addStandardBtn.style.width = '100%';
    addStandardBtn.style.background = '#2c3e50';
    addStandardBtn.style.color = 'white';

    addStandardBtn.onclick = () => {
        const ui = document.createElement('div');
        ui.style.marginTop = '10px'; ui.style.padding = '10px'; ui.style.background = '#f1f1f1'; ui.style.borderRadius = '5px';

        // Liste déroulante des champs disponibles
        const select = document.createElement('select');
        select.className = 'form-control';
        select.style.marginBottom = '10px';

        let hasOptions = false;
        for (const [key, conf] of Object.entries(ZOLA_DEFAULTS)) {
            // On ne propose que ce qui n'est pas encore utilisé (sauf extra qui est spécial)
            if (!usedKeys.has(key) && key !== 'extra') {
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = `${conf.label} (${key})`;
                select.appendChild(opt);
                hasOptions = true;
            }
        }

        if (!hasOptions) {
            ui.innerHTML = "<div style='color:#666;'>Tous les champs standards sont déjà utilisés.</div>";
            const closeBtn = document.createElement('button');
            closeBtn.innerText = "Fermer"; closeBtn.className = 'btn'; closeBtn.style.marginTop = '5px';
            closeBtn.onclick = () => rootContainer.replaceChild(addStandardBtn, ui);
            ui.appendChild(closeBtn);
        } else {
            const addBtn = document.createElement('button'); addBtn.innerText = "Ajouter"; addBtn.className = 'btn'; addBtn.style.background = '#28a745'; addBtn.style.color = 'white'; addBtn.style.marginRight = '5px';
            const cancelBtn = document.createElement('button'); cancelBtn.innerText = "Annuler"; cancelBtn.className = 'btn'; cancelBtn.style.background = '#dc3545'; cancelBtn.style.color = 'white';

            addBtn.onclick = () => {
                const key = select.value;
                const conf = ZOLA_DEFAULTS[key];
                // Création
                const el = createInputElement(key, "", 'root', callbacks, projectDir, container, conf.type);
                fieldsWrapperRoot.appendChild(el);
                updateSchema(container, key, 'root');
                usedKeys.add(key); // Marquer comme utilisé
                rootContainer.replaceChild(addStandardBtn, ui);
            };
            cancelBtn.onclick = () => rootContainer.replaceChild(addStandardBtn, ui);

            ui.appendChild(select);
            ui.appendChild(addBtn);
            ui.appendChild(cancelBtn);
        }
        rootContainer.replaceChild(ui, addStandardBtn);
    };
    rootContainer.appendChild(addStandardBtn);

    // --- BOUTON 2 : AJOUTER VARIABLE PERSO (EXTRA) ---
    const addCustomBtn = document.createElement('button');
    addCustomBtn.innerHTML = "➕ Ajouter Variable Perso";
    addCustomBtn.className = 'btn';
    addCustomBtn.style.marginTop = '15px';
    addCustomBtn.style.width = '100%';
    addCustomBtn.style.background = '#6f42c1'; // Violet
    addCustomBtn.style.color = 'white';

    addCustomBtn.onclick = () => {
        const ui = document.createElement('div');
        ui.style.marginTop = '10px'; ui.style.padding = '10px'; ui.style.background = '#f1f1f1'; ui.style.borderRadius = '5px'; ui.style.display = 'flex'; ui.style.gap = '5px'; ui.style.flexWrap = 'wrap';

        const nameInput = document.createElement('input');
        nameInput.placeholder = "Nom (ex: author)";
        nameInput.className = 'form-control'; nameInput.style.flex = '1';

        const typeSelect = document.createElement('select');
        typeSelect.className = 'form-control';
        typeSelect.style.width = '100px';
        typeSelect.innerHTML = `
            <option value="text">Texte</option>
            <option value="list">Liste</option>
            <option value="image">Image</option>
            <option value="video">Vidéo</option>
            <option value="boolean">Vrai/Faux</option>
            <option value="date">Date</option>
        `;

        const confirmBtn = document.createElement('button'); confirmBtn.innerText = "OK"; confirmBtn.className = 'btn'; confirmBtn.style.background = '#28a745'; confirmBtn.style.color = 'white';
        const cancelBtn = document.createElement('button'); cancelBtn.innerText = "X"; cancelBtn.className = 'btn'; cancelBtn.style.background = '#dc3545'; cancelBtn.style.color = 'white';

        confirmBtn.onclick = () => {
            const keyName = nameInput.value.trim().toLowerCase().replace(/\s+/g, '_'); // Nettoyage nom
            if (keyName) {
                const el = createInputElement(keyName, "", 'extra', callbacks, projectDir, container, typeSelect.value);
                fieldsWrapperExtra.appendChild(el);
                updateSchema(container, keyName, 'extra');
                extraContainer.replaceChild(addCustomBtn, ui);
            }
        };
        cancelBtn.onclick = () => extraContainer.replaceChild(addCustomBtn, ui);

        ui.appendChild(nameInput);
        ui.appendChild(typeSelect);
        ui.appendChild(confirmBtn);
        ui.appendChild(cancelBtn);
        extraContainer.replaceChild(ui, addCustomBtn);
        nameInput.focus();
    };
    extraContainer.appendChild(addCustomBtn);

    mainWrapper.appendChild(rootContainer);
    mainWrapper.appendChild(extraContainer);
    container.appendChild(mainWrapper);

    // --- ZONE 3 : CONTENU ---
    const blocksHeader = document.createElement('h3'); blocksHeader.innerHTML = '📝 Contenu de la page'; blocksHeader.style.color = '#2c3e50'; blocksHeader.style.marginTop = '0';
    container.appendChild(blocksHeader);

    const toolbar = document.createElement('div'); toolbar.style.display = 'flex'; toolbar.style.gap = '10px'; toolbar.style.marginBottom = '20px'; toolbar.style.padding = '10px'; toolbar.style.background = '#ecf0f1'; toolbar.style.borderRadius = '5px'; toolbar.style.flexWrap = 'wrap';
    const createBtn = (label, color, onClick) => { const b = document.createElement('button'); b.innerText = label; b.style.background = color; b.style.color = 'white'; b.style.border = 'none'; b.style.padding = '8px 15px'; b.style.borderRadius = '4px'; b.style.cursor = 'pointer'; b.style.fontWeight = 'bold'; b.onclick = onClick; return b; };

    toolbar.appendChild(createBtn("➕ Titre", "#3498db", () => callbacks.onAddHeading(2, "Titre")));
    toolbar.appendChild(createBtn("➕ Sous-titre", "#2980b9", () => callbacks.onAddHeading(3, "Sous-titre")));
    toolbar.appendChild(createBtn("➕ Texte", "#27ae60", () => callbacks.onAddParagraph("Texte...")));
    toolbar.appendChild(createBtn("➕ Citation", "#f1c40f", () => callbacks.onAddBlockquote("Citation...")));
    toolbar.appendChild(createBtn("➕ Liste", "#9b59b6", () => callbacks.onAddList()));
    toolbar.appendChild(createBtn("➕ Code", "#34495e", () => callbacks.onAddCode()));
    toolbar.appendChild(createBtn("➕ Image", "#e74c3c", () => callbacks.onAddImageBlock()));
    toolbar.appendChild(createBtn("➕ Vidéo", "#8e44ad", () => callbacks.onAddVideoBlock()));

    container.appendChild(toolbar);

    const blocksList = document.createElement('div'); blocksList.id = 'blocks-container';
    if (ast && ast.children) {
        ast.children.forEach((node, index) => {
            if (node.type === 'text' && node.value === '\n') return;
            const block = createBlockElement(node, index, callbacks, projectDir);
            blocksList.appendChild(block);
        });
    } else { blocksList.innerHTML = "<div style='color:#7f8c8d; text-align:center;'>Vide.</div>"; }
    container.appendChild(blocksList);
}

module.exports = { generateForm };