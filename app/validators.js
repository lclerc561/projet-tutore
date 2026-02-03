// validators.js

/**
 * Vérifie si une date est au format strict YYYY-MM-DD
 * @param {string} dateString - La date à tester
 * @returns {boolean} - True si valide
 */
function isDateValid(dateString) {
    // Regex stricte : 4 chiffres - 2 chiffres - 2 chiffres
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!regex.test(dateString)) return false;

    // Vérifie si la date existe vraiment (ex: pas de 30 février)
    const date = new Date(dateString);
    const timestamp = date.getTime();

    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;

    return date.toISOString().startsWith(dateString);
}

/**
 * Fonction principale qui vérifie tout le formulaire
 * @param {Object} formData - Objet contenant clé:valeur du formulaire
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
function validerFormulaire(formData) {
    
    for (const [key, value] of Object.entries(formData)) {
        
        // 1. Règle : Le Titre est obligatoire
        if (key === 'title') {
            if (!value || value.trim() === '') {
                return { isValid: false, error: "Le champ 'TITLE' ne peut pas être vide." };
            }
        }

        // 2. Règle : Validation stricte des dates
        // On vérifie si la clé contient "date" (ex: date, publish_date, etc.)
        if (key.toLowerCase().includes('date')) {
            if (!isDateValid(value)) {
                return { 
                    isValid: false, 
                    error: `La date pour '${key}' est invalide.\nFormat attendu : AAAA-MM-JJ (ex: 2024-05-20)` 
                };
            }
        }

        // 3. Règle : Template doit finir par .html
        if (key === 'template') {
            if (!value.endsWith('.html')) {
                return { isValid: false, error: "Le template doit finir par '.html'" };
            }
        }
    }

    return { isValid: true, error: null };
}

module.exports = { validerFormulaire };