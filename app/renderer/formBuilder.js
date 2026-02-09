const path = require('path');

// ============================================================
// 1. MÉTADONNÉES (Inchangé mais inclus pour complétude)
// ============================================================
function createInputElement(key, value, context, callbacks, projectDir) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';
    const label = document.createElement('label');
    label.innerText = (context === 'extra' ? 'EXTRA > ' : '') + key.toUpperCase();
    if (context === 'extra') label.style.color = '#6f42c1';
    wrapper.appendChild(label);
    const inputId = `field-${context}-${key}`;
    const previewId = `preview-${context}-${key}`;
    const lowerKey = key.toLowerCase();
    const isImage = lowerKey.match(/image|img|icon|logo|cover|hero/) || (typeof value === 'string' && value.match(/\.(jpg|png|gif|svg|webp)$/i));
    const isVideo = lowerKey.match(/video|vid|movie/) || (typeof value === 'string' && value.match(/\.(mp4|webm|mov|mkv)$/i));

    if (isVideo || isImage) {
        const container = document.createElement('div');
        container.style.border = '1px dashed #ccc'; container.style.padding = '10px';
        container.style.background = isVideo ? '#e2e6ea' : '#f9f9f9'; container.style.borderRadius = '5px';
        const mediaPreview = document.createElement(isVideo ? 'video' : 'img');
        mediaPreview.id = previewId; mediaPreview.style.maxWidth = '100%'; mediaPreview.style.maxHeight = '200px'; mediaPreview.style.marginBottom = '10px';
        if (isVideo) mediaPreview.controls = true;
        if(value && typeof value === 'string') {
            if (value.startsWith('/') && projectDir) {
                const cleanPath = value.substring(1); 
                const fullPath = path.join(projectDir, 'static', cleanPath);
                mediaPreview.src = `file://${fullPath}`;
            } else { mediaPreview.src = value; }
            mediaPreview.style.display = 'block';
        } else { mediaPreview.style.display = 'none'; }
        container.appendChild(mediaPreview);
        const input = document.createElement('input');
        input.type = 'text'; input.value = value || ''; input.id = inputId; input.className = 'form-control'; 
        input.style.width = '100%'; input.style.marginBottom = '10px';
        container.appendChild(input);
        const btn = document.createElement('button');
        btn.innerText = isVideo ? "🎬 Changer Vidéo" : "🖼️ Changer Image";
        btn.className = 'btn'; btn.style.background = isVideo ? '#6f42c1' : '#17a2b8'; btn.style.color = 'white';
        btn.onclick = (e) => { e.preventDefault(); if(isVideo) callbacks.onImportVideo(inputId, previewId); else callbacks.onImportImage(inputId, previewId); };
        container.appendChild(btn); wrapper.appendChild(container);
    } else if (typeof value === 'boolean') {
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = value; input.id = inputId; wrapper.appendChild(input);
    } else {
        const input = document.createElement('input'); input.type = 'text'; input.className = 'form-control';
        if (value instanceof Date) { try { input.value = value.toISOString().split('T')[0]; } catch (e) { input.value = String(value); } } else if (Array.isArray(value)) { input.value = value.join(', '); } else { input.value = String(value); }
        input.id = inputId; input.style.width = '100%'; wrapper.appendChild(input);
    }
    return wrapper;
}

// ============================================================
// 2. BLOCS DE CONTENU
// ============================================================

function createBlockElement(node, index, callbacks) {
    const wrapper = document.createElement('div');
    wrapper.className = 'block-item';
    wrapper.style.marginBottom = '15px'; wrapper.style.padding = '15px 15px 15px 40px'; 
    wrapper.style.background = 'white'; wrapper.style.border = '1px solid #e0e0e0'; 
    wrapper.style.borderRadius = '8px'; wrapper.style.position = 'relative'; 
    wrapper.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; wrapper.style.transition = 'all 0.2s';

    // Drag & Drop UI
    wrapper.draggable = true;
    const grip = document.createElement('div'); grip.innerHTML = '⋮⋮';
    grip.style.position = 'absolute'; grip.style.left = '10px'; grip.style.top = '50%'; grip.style.transform = 'translateY(-50%)';
    grip.style.cursor = 'grab'; grip.style.color = '#ccc'; grip.style.fontSize = '20px'; grip.style.fontWeight = 'bold';
    wrapper.appendChild(grip);

    // Events Drag
    wrapper.addEventListener('dragstart', (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', index); wrapper.style.opacity = '0.5'; });
    wrapper.addEventListener('dragend', () => { wrapper.style.opacity = '1'; document.querySelectorAll('.block-item').forEach(el => el.style.borderTop = '1px solid #e0e0e0'); });
    wrapper.addEventListener('dragover', (e) => { e.preventDefault(); wrapper.style.borderTop = '2px solid #3498db'; });
    wrapper.addEventListener('dragleave', () => { wrapper.style.borderTop = '1px solid #e0e0e0'; });
    wrapper.addEventListener('drop', (e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain')); if (from !== index) callbacks.onMoveBlock(from, index); });

    // Badge & Delete
    const badge = document.createElement('span');
    badge.style.position = 'absolute'; badge.style.top = '-10px'; badge.style.left = '10px';
    badge.style.fontSize = '10px'; badge.style.padding = '2px 6px'; badge.style.borderRadius = '4px';
    badge.style.color = 'white'; badge.style.fontWeight = 'bold'; badge.style.textTransform = 'uppercase';
    wrapper.appendChild(badge);

    const btnDelete = document.createElement('button');
    btnDelete.innerHTML = '✖';
    btnDelete.style.position = 'absolute'; btnDelete.style.top = '5px'; btnDelete.style.right = '5px';
    btnDelete.style.border = 'none'; btnDelete.style.background = 'transparent'; btnDelete.style.color = '#dc3545'; btnDelete.style.cursor = 'pointer';
    btnDelete.onclick = () => callbacks.onDeleteBlock(index);
    wrapper.appendChild(btnDelete);

    // --- CONTENU SELON TYPE ---

    // 1. TITRES
    if (node.type === 'heading') {
        badge.innerText = `H${node.depth}`; badge.style.background = '#3498db'; 
        let val = node.children.map(c => c.value || '').join('');
        const input = document.createElement('input');
        input.type = 'text'; input.value = val; input.style.width = '100%'; input.style.border = 'none'; input.style.outline = 'none'; 
        input.style.fontWeight = 'bold'; input.style.fontSize = (26 - (node.depth * 2)) + 'px';
        input.draggable = true; input.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        
        input.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, false); // Mode Simple
        wrapper.appendChild(input);

    // 2. PARAGRAPHES
    } else if (node.type === 'paragraph') {
        badge.innerText = 'Texte'; badge.style.background = '#27ae60'; 
        let val = node.children.map(c => c.value || '').join('');
        const area = document.createElement('textarea');
        area.value = val; area.style.width = '100%'; area.style.minHeight = '60px'; area.style.border = 'none'; area.style.resize = 'vertical'; area.style.outline = 'none'; area.style.fontFamily = 'inherit';
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, false); // Mode Simple
        wrapper.appendChild(area);

    // 3. CITATIONS (CLEAN !)
    } else if (node.type === 'blockquote') {
        badge.innerText = 'Citation'; badge.style.background = '#f1c40f';
        
        // Extraction intelligente du texte SANS le ">"
        let rawText = "";
        if(node.children && node.children.length > 0 && node.children[0].type === 'paragraph') {
             // Blockquote > Paragraph > Text
             rawText = node.children[0].children.map(c => c.value).join('');
        }

        const area = document.createElement('textarea');
        area.value = rawText; 
        area.style.width = '100%'; area.style.minHeight = '60px'; 
        area.style.border = 'none';
        area.style.borderLeft = '5px solid #f1c40f'; // Barre Jaune
        area.style.padding = '10px'; area.style.backgroundColor = '#fffcf5'; 
        area.style.resize = 'vertical'; area.style.outline = 'none';
        
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });

        // Update spécial "blockquote"
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'blockquote'); 
        wrapper.appendChild(area);

    // 4. LISTES (BULLET POINTS)
    } else if (node.type === 'list') {
        badge.innerText = 'Liste'; badge.style.background = '#9b59b6'; // Violet
        
        const rawMd = callbacks.nodeToMarkdown(node); // On garde les tirets "-"
        const area = document.createElement('textarea');
        area.value = rawMd; 
        area.style.width = '100%'; area.style.minHeight = '80px'; 
        area.style.border = '1px solid #ddd'; area.style.borderRadius = '4px';
        area.style.padding = '10px'; area.style.fontFamily = 'monospace';
        
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'raw');
        wrapper.appendChild(area);

    // 5. CODE BLOCKS
    } else if (node.type === 'code') {
        badge.innerText = 'Code (' + (node.lang || 'txt') + ')'; badge.style.background = '#34495e'; // Bleu Foncé
        
        const rawMd = callbacks.nodeToMarkdown(node);
        const area = document.createElement('textarea');
        area.value = rawMd; 
        area.style.width = '100%'; area.style.minHeight = '100px'; 
        area.style.border = '1px solid #333'; area.style.borderRadius = '4px';
        area.style.padding = '10px'; area.style.fontFamily = 'monospace';
        area.style.backgroundColor = '#2c3e50'; area.style.color = '#ecf0f1'; // Style console
        
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'raw');
        wrapper.appendChild(area);

    // 6. AUTRES (Image, etc.)
    } else {
        badge.innerText = node.type.toUpperCase(); badge.style.background = '#95a5a6';
        const rawMd = callbacks.nodeToMarkdown(node);
        const area = document.createElement('textarea');
        area.value = rawMd; 
        area.style.width = '100%'; area.style.minHeight = '60px'; 
        area.style.border = '1px solid #eee'; area.style.padding = '10px'; area.style.backgroundColor = '#fafafa'; area.style.fontFamily = 'monospace';
        area.draggable = true; area.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
        area.oninput = (e) => callbacks.onUpdateBlock(index, e.target.value, 'raw');
        wrapper.appendChild(area);
    }

    return wrapper;
}

// ============================================================
// 3. GÉNÉRATION GLOBALE
// ============================================================

function generateForm(container, frontMatter, ast, schema, callbacks, projectDir) {
    container.innerHTML = '';
    
    // MÉTADONNÉES
    const metaContainer = document.createElement('div');
    metaContainer.style.background = '#fff'; metaContainer.style.padding = '20px'; metaContainer.style.borderRadius = '8px'; metaContainer.style.border = '1px solid #ddd'; metaContainer.style.marginBottom = '30px';
    metaContainer.innerHTML = '<h3 style="margin-top:0; color:#2c3e50; border-bottom:2px solid #f1f1f1; padding-bottom:10px;">⚙️ Configuration</h3>';
    function processFields(obj, context) {
        for (const key in obj) {
            const value = obj[key];
            if (key === 'extra' && typeof value === 'object' && value !== null) { processFields(value, 'extra'); } 
            else if (value !== null && typeof value !== 'object') {
                const el = createInputElement(key, value, context, callbacks, projectDir);
                metaContainer.appendChild(el); schema.push({ key, context });
            }
        }
    }
    processFields(frontMatter, 'root');
    container.appendChild(metaContainer);

    // CONTENU
    const blocksHeader = document.createElement('h3'); blocksHeader.innerHTML = '📝 Contenu'; blocksHeader.style.color = '#2c3e50'; blocksHeader.style.marginTop = '0';
    container.appendChild(blocksHeader);

    // TOOLBAR
    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex'; toolbar.style.gap = '10px'; toolbar.style.marginBottom = '20px'; toolbar.style.padding = '10px'; toolbar.style.background = '#ecf0f1'; toolbar.style.borderRadius = '5px'; toolbar.style.flexWrap = 'wrap';

    const createBtn = (label, color, onClick) => {
        const b = document.createElement('button'); b.innerText = label; b.style.background = color; b.style.color = 'white'; b.style.border = 'none'; b.style.padding = '8px 15px'; b.style.borderRadius = '4px'; b.style.cursor = 'pointer'; b.style.fontWeight = 'bold'; b.onclick = onClick; return b;
    };

    toolbar.appendChild(createBtn("➕ Titre", "#3498db", () => callbacks.onAddHeading(2, "Titre")));
    toolbar.appendChild(createBtn("➕ Sous-titre", "#2980b9", () => callbacks.onAddHeading(3, "Sous-titre")));
    toolbar.appendChild(createBtn("➕ Texte", "#27ae60", () => callbacks.onAddParagraph("Texte...")));
    toolbar.appendChild(createBtn("➕ Citation", "#f1c40f", () => callbacks.onAddBlockquote("Citation...")));
    toolbar.appendChild(createBtn("➕ Liste", "#9b59b6", () => callbacks.onAddList()));
    toolbar.appendChild(createBtn("➕ Code", "#34495e", () => callbacks.onAddCode()));

    container.appendChild(toolbar);

    // BLOCKS
    const blocksList = document.createElement('div'); blocksList.id = 'blocks-container';
    if (ast && ast.children) {
        ast.children.forEach((node, index) => {
            if (node.type === 'text' && node.value === '\n') return;
            const block = createBlockElement(node, index, callbacks);
            blocksList.appendChild(block);
        });
    } else { blocksList.innerHTML = "<div style='color:#7f8c8d; text-align:center;'>Vide.</div>"; }
    container.appendChild(blocksList);
}

module.exports = { generateForm };