const path = require('path');

function createInputElement(key, value, context, callbacks) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.innerText = (context === 'extra' ? 'EXTRA > ' : '') + key.toUpperCase();
    if (context === 'extra') label.style.color = '#6f42c1';
    wrapper.appendChild(label);

    const inputId = `field-${context}-${key}`;
    const previewId = `preview-${context}-${key}`;
    
    // Détection basique (Image/Vidéo)
    const lowerKey = key.toLowerCase();
    const isImage = lowerKey.match(/image|img|icon|logo|cover|hero/) || (typeof value === 'string' && value.match(/\.(jpg|png|gif|svg|webp)$/i));
    const isVideo = lowerKey.match(/video|vid|movie/) || (typeof value === 'string' && value.match(/\.(mp4|webm|mov)$/i));

    if (isVideo || isImage) {
        // --- GESTION MÉDIA ---
        const container = document.createElement('div');
        container.style.border = '1px dashed #ccc';
        container.style.padding = '10px';
        container.style.background = isVideo ? '#e2e6ea' : '#f9f9f9';
        container.style.borderRadius = '5px';

        const mediaPreview = document.createElement(isVideo ? 'video' : 'img');
        mediaPreview.id = previewId;
        mediaPreview.style.maxWidth = '100%';
        mediaPreview.style.maxHeight = '200px';
        mediaPreview.style.marginBottom = '10px';
        mediaPreview.style.display = 'none'; 
        
        container.appendChild(mediaPreview);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.id = inputId;
        input.style.width = '100%';
        input.style.marginBottom = '10px';
        container.appendChild(input);

        const btn = document.createElement('button');
        btn.innerText = isVideo ? "🎬 Changer Vidéo" : "🖼️ Changer Image";
        btn.className = 'btn'; 
        btn.style.background = isVideo ? '#6f42c1' : '#17a2b8';
        btn.style.color = 'white';
        btn.onclick = (e) => {
            e.preventDefault();
            if(isVideo) callbacks.onImportVideo(inputId, previewId);
            else callbacks.onImportImage(inputId, previewId);
        };
        container.appendChild(btn);
        wrapper.appendChild(container);

    } else if (typeof value === 'boolean') {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        input.id = inputId;
        wrapper.appendChild(input);
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        if (value instanceof Date) {
             try { input.value = value.toISOString().split('T')[0]; } catch (e) { input.value = String(value); }
        } else if (Array.isArray(value)) {
            input.value = value.join(', ');
        } else {
            input.value = String(value);
        }
        input.id = inputId;
        input.style.width = '100%';
        wrapper.appendChild(input);
    }

    return wrapper;
}

function generateForm(container, frontMatter, markdownContent, schema, callbacks) {
    container.innerHTML = '';
    
    // 1. FrontMatter (Champs classiques)
    function processFields(obj, context) {
        for (const key in obj) {
            const value = obj[key];
            if (key === 'extra' && typeof value === 'object' && value !== null) {
                processFields(value, 'extra');
            } else if (value !== null && typeof value !== 'object') {
                const el = createInputElement(key, value, context, callbacks);
                container.appendChild(el);
                schema.push({ key, context });
            }
        }
    }
    processFields(frontMatter, 'root');

    // 2. ZONE AJOUT DE CONTENU (Modifiée selon tes goûts)
    const headingWrapper = document.createElement('div');
    headingWrapper.className = 'form-group';
    headingWrapper.style.marginTop = '40px';
    headingWrapper.style.padding = '20px';
    headingWrapper.style.backgroundColor = '#f1f3f5'; // Gris très clair
    headingWrapper.style.border = '1px solid #dee2e6';
    headingWrapper.style.borderRadius = '8px';
    
    headingWrapper.innerHTML = `
        <label style="color:#2c3e50; font-weight:bold; font-size: 1.2em; display:block; margin-bottom:15px;">➕ Ajouter du contenu</label>
        
        <div style="display:flex; flex-direction: row; gap:10px; margin-bottom:20px; align-items: center;">
            
            <select id="heading-level" style="width: 140px; height: 50px; padding: 5px; border: 1px solid #ced4da; border-radius: 4px; background: white; cursor: pointer;">
                <option value="2">H2 (Grand)</option>
                <option value="3">H3 (Moyen)</option>
                <option value="4">H4 (Petit)</option>
            </select>
            
            <input type="text" id="heading-text" placeholder="Titre de la section..." 
                   style="flex: 1; height: 50px; padding: 0 15px; font-size: 1.1em; border: 1px solid #ced4da; border-radius: 4px;">
            
            <button type="button" id="btn-add-heading" class="btn" 
                    style="height: 50px; background:#28a745; color:white; border:none; padding: 0 20px; font-weight:bold; cursor:pointer; border-radius: 4px;">
                AJOUTER
            </button>
        </div>

        <div style="background: white; padding: 15px; border: 1px solid #ced4da; border-radius: 4px;">
            <label style="font-size: 0.9em; color: #495057; margin-bottom: 8px; display: block; font-weight: bold;">Nouveau paragraphe :</label>
            <textarea id="paragraph-text" 
                      placeholder="Écrivez votre texte ici..." 
                      style="width: 100%; height: 100px; padding: 10px; resize: vertical; border: 1px solid #ced4da; border-radius: 4px; font-family: sans-serif; font-size: 14px; box-sizing: border-box;"></textarea>
            
            <div style="text-align: right; margin-top: 10px;">
                <button type="button" id="btn-add-paragraph" class="btn" 
                        style="background:#17a2b8; color:white; border:none; padding: 8px 20px; font-size: 14px; cursor:pointer; border-radius: 4px;">
                    Ajouter le Texte
                </button>
            </div>
        </div>
    `;
    container.appendChild(headingWrapper);

    // 3. Contenu Markdown (Éditeur final)
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'form-group';
    contentWrapper.style.marginTop = '20px';
    contentWrapper.innerHTML = '<label style="font-weight:bold;">CONTENU FINAL (Markdown)</label>';
    
    const textarea = document.createElement('textarea');
    textarea.id = 'field-content';
    textarea.value = markdownContent;
    textarea.style.width = '100%';
    textarea.style.minHeight = '500px';
    textarea.style.padding = '15px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '14px';
    textarea.style.lineHeight = '1.6';
    textarea.style.border = '1px solid #ccc';
    textarea.style.borderRadius = '4px';
    
    contentWrapper.appendChild(textarea);
    container.appendChild(contentWrapper);

    // 4. Événements
    container.querySelector('#btn-add-heading').onclick = () => {
        const level = parseInt(document.getElementById('heading-level').value, 10);
        const text = document.getElementById('heading-text').value;
        callbacks.onAddHeading(level, text); 
        document.getElementById('heading-text').value = ''; 
    };

    container.querySelector('#btn-add-paragraph').onclick = () => {
        const text = document.getElementById('paragraph-text').value;
        callbacks.onAddParagraph(text); 
        document.getElementById('paragraph-text').value = ''; 
    };
}

module.exports = { generateForm };