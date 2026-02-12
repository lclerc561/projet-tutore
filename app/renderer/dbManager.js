// renderer/dbManager.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Création du fichier de base de données dans le dossier de l'appli
const dbPath = path.join(__dirname, '../users.db');
const db = new sqlite3.Database(dbPath);

// Initialisation de la table au premier lancement
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        token TEXT
    )`);

    // Ajout d'utilisateurs de test (à faire une seule fois)
    // Mot de passe en clair pour l'exemple, mais à hacher en prod !
    db.run(`INSERT OR IGNORE INTO users (username, password, role, token) 
            VALUES ('prof', 'admin123', 'admin', 'ghp_ton_token_ici')`);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) 
            VALUES ('etudiant', 'edit123', 'editor')`);
});

function verifierUtilisateur(username, password, callback) {
    const query = `SELECT role, token FROM users WHERE username = ? AND password = ?`;
    db.get(query, [username, password], (err, row) => {
        if (err) return callback(err);
        callback(null, row); // Retourne le rôle et le token si trouvé
    });
}

module.exports = { verifierUtilisateur };