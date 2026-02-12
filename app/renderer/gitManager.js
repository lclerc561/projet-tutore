// renderer/gitManager.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function execGit(commande, projectDir) {
    return new Promise((resolve, reject) => {
        exec(commande, { cwd: projectDir }, (error, stdout, stderr) => {
            if (error) reject(stderr || error.message);
            else resolve(stdout ? stdout.trim() : '');
        });
    });
}

module.exports = {
    chargerHistorique: async function(projectDir, voirVersionCallback) {
        const divHistory = document.getElementById('git-history');
        if (!divHistory || !fs.existsSync(path.join(projectDir, '.git'))) return;

        try {
            const logs = await execGit('git log --pretty=format:"%h|%ad|%s" --date=short -n 10', projectDir);
            divHistory.innerHTML = logs.split('\n').map(ligne => {
                const [hash, date, msg] = ligne.split('|');
                return `<div class="history-item" onclick="window.voirVersionRelais('${hash}')">
                            <strong>${hash}</strong> <small>${date}</small><br>${msg}
                        </div>`;
            }).join('');
        } catch (e) {}
    },

    nouvelleSauvegarde: async function(projectDir, cb, refresh) {
        // Au lieu de prompt(), on pourrait utiliser un input dans l'UI
        // Ici, j'utilise une valeur par défaut pour éviter le blocage
        const msg = "Update " + new Date().toLocaleString(); 
        try {
            cb("⏳ Backup local...", false);
            await execGit('git add .', projectDir);
            await execGit(`git commit -m "${msg}"`, projectDir);
            cb("✅ Backup réussi", false);
            refresh();
        } catch (e) { cb("Erreur Git: " + e, true); }
    },

    pushToRemote: async function(projectDir, cb, token) {
        if (!projectDir || !token) return cb("Token manquant", true);
        
        cb("🚀 Publication vers GitHub...", false);
        try {
            const remoteUrl = await execGit('git config --get remote.origin.url', projectDir);
            const authUrl = remoteUrl.replace('https://', `https://${token}@`);
            
            await execGit(`git push "${authUrl}" main`, projectDir);
            cb("✨ Site en ligne !", false);
        } catch (e) {
            cb("❌ Échec push : vérifiez le token", true);
        }
    },

    voirVersion: async function(hash, projectDir, callbacks) {
        try {
            await execGit(`git checkout ${hash}`, projectDir);
            callbacks.afficherMessage(`Vue : ${hash}`, false);
            callbacks.reloadUI();
        } catch (e) { callbacks.afficherMessage("Erreur checkout", true); }
    },

    revenirAuPresent: async function(projectDir, callbacks) {
        try {
            await execGit('git checkout main', projectDir);
            callbacks.afficherMessage("Retour au présent", false);
            callbacks.reloadUI();
        } catch (e) { callbacks.afficherMessage("Erreur retour", true); }
    }
};