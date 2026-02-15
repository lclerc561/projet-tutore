// renderer/ftpManager.js
const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

module.exports = {
    /**
     * Déploie le contenu d'un dossier local vers un serveur FTP
     * @param {Object} config - { host, user, password, port, remoteRoot }
     * @param {String} localDir - Chemin absolu du dossier 'public' généré
     * @param {Function} logCallback - Fonction pour afficher les messages
     */
    deploy: async function(config, localDir, logCallback) {
        const client = new ftp.Client();
        // Optionnel : logs de debug dans la console
        // client.ftp.verbose = true; 

        try {
            logCallback("🔌 Connexion au serveur FTP...", false);
            
            await client.access({
                host: config.host,
                user: config.user,
                password: config.password,
                port: config.port || 21,
                secure: false // Passer à true si FTPS explicite
            });

            logCallback("✅ Connecté ! Préparation du transfert...", false);

            // On s'assure d'être dans le bon dossier distant (ex: /www ou /public_html)
            await client.ensureDir(config.remoteRoot);
            
            // On vide le dossier distant avant (Optionnel, mais plus propre)
            logCallback("🧹 Nettoyage du dossier distant...", false);
            await client.clearWorkingDir();

            logCallback("🚀 Envoi des fichiers en cours...", false);
            
            // Upload du dossier complet
            await client.uploadFromDir(localDir);

            logCallback("✅ Déploiement terminé avec succès !", false);

        } catch(err) {
            console.error(err);
            logCallback(`❌ Erreur FTP : ${err.message}`, true);
            throw err; // On relance l'erreur pour le renderer
        } finally {
            client.close();
        }
    },

    /**
     * Sauvegarde la config FTP dans le dossier du projet (fichier deploy.json)
     */
    saveConfig: function(projectDir, configData) {
        const configPath = path.join(projectDir, 'deploy.json');
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    },

    /**
     * Charge la config FTP si elle existe
     */
    loadConfig: function(projectDir) {
        const configPath = path.join(projectDir, 'deploy.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        return null;
    }
};