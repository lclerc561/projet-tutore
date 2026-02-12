// renderer/authManager.js
let currentUser = null;

const ROLES = {
    ADMIN: 'admin',
    EDITOR: 'editor'
};

function login(username, role, token = null) {
    currentUser = { username, role, token };
    updateUIForRole();
}
-
function logout() {
    currentUser = null;
    // Redirection vers la page de connexion
    window.location.href = 'login.html';
}

function updateUIForRole() {
    const pushBtn = document.getElementById('btn-push');
    if (pushBtn) {
        // Utilisation du chaînage optionnel ?. pour éviter les erreurs si currentUser est null
        pushBtn.style.display = (currentUser?.role === ROLES.ADMIN) ? 'block' : 'none';
    }
}

function getCurrentUser() { return currentUser; }

module.exports = { login, logout, getCurrentUser, ROLES }; // N'oublie pas d'exporter logout