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

function logout() {
    currentUser = null;
    window.location.href = 'login.html';
}

function updateUIForRole() {
    const pushBtn = document.getElementById('btn-push');
    if (pushBtn) {
        pushBtn.style.display = (currentUser?.role === ROLES.ADMIN) ? 'block' : 'none';
    }
}

function getCurrentUser() { return currentUser; }

// Exportation groupée à la fin
module.exports = { 
    login, 
    logout, 
    getCurrentUser, 
    ROLES 
};