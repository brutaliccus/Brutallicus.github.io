function createUserAdminModule() {
    let db, getState;

    const userListContainer = document.getElementById('user-list-container');
    
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    };

    async function renderUsersTab() {
        userListContainer.innerHTML = '<p>Loading user data...</p>';
        try {
            const [usersSnapshot, statusSnapshot] = await Promise.all([
                db.ref('/users').once('value'),
                db.ref('/status').once('value')
            ]);
            const users = usersSnapshot.val();
            const statuses = statusSnapshot.val();
            
            let tableHTML = '<table class="log-table"><tr><th>Status</th><th>Name</th><th>Last Active</th><th>Actions</th></tr>';
            for (const userId in users) {
                const user = users[userId];
                const status = statuses ? statuses[userId] : null;
                const isOnline = status && status.state === 'online';
                const statusIndicator = `<span class="status-indicator ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>`;
                const lastActive = formatTimestamp(status ? status.last_changed : null);
                tableHTML += `
                    <tr data-user-id="${userId}">
                        <td>${statusIndicator}</td>
                        <td>${user.name}</td>
                        <td>${lastActive}</td>
                        <td class="actions-cell">
                            <button class="icon-btn reset-pin" title="Reset PIN">&#128273;</button>
                            <button class="icon-btn delete" title="Delete User">&#128465;</button>
                        </td>
                    </tr>`;
            }
            tableHTML += '</table>';
            userListContainer.innerHTML = tableHTML;
        } catch (error) {
            userListContainer.innerHTML = '<p style="color: var(--danger-color);">Could not load user data.</p>';
            console.error("Error rendering users tab:", error);
        }
    }

    function bindEvents() {
        userListContainer.addEventListener('click', (e) => {
            const userRow = e.target.closest('tr[data-user-id]');
            if (!userRow) return;
            
            const userIdToUpdate = userRow.dataset.userId;
            const userName = userRow.cells[1].textContent;

            if (e.target.matches('.icon-btn.delete')) {
                if (userIdToUpdate === getState().currentUserId) {
                    alert("You cannot delete your own account.");
                    return;
                }
                if (confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
                    db.ref('/users/' + userIdToUpdate).remove();
                    db.ref('/status/' + userIdToUpdate).remove();
                    renderUsersTab();
                }
            } else if (e.target.matches('.icon-btn.reset-pin')) {
                if (confirm(`Reset PIN for "${userName}"?`)) {
                    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                    db.ref(`/users/${userIdToUpdate}/pin`).set(newPin)
                      .then(() => alert(`Success! New PIN for "${userName}" is: ${newPin}`))
                      .catch((err) => alert('Error resetting PIN.'));
                }
            }
        });
    }

    function init(api) {
        db = api.db;
        getState = api.getState;
        bindEvents();
    }

    return {
        init,
        render: renderUsersTab
    };
}