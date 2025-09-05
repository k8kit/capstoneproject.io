// Admin accounts management
class AdminAccounts {
    constructor() {
        this.currentUserId = null;
        this.init();
    }

    init() {
        this.loadUsers();
        this.setupEventListeners();
        this.startAutoRefresh();
    }
    
    startAutoRefresh() {
        // Auto-refresh every 60 seconds for user accounts
        setInterval(() => {
            this.loadUsers();
        }, 60000);
    }

    setupEventListeners() {
        // Add user form
        document.getElementById('add-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // Edit user form
        document.getElementById('edit-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUser();
        });
    }

    async loadUsers() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderUsersTable(result.data);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users data');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-people" style="font-size: 2rem;"></i>
                        <p class="mt-2">No users found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <span class="fw-bold">${user.username}</span>
                </td>
                <td>${user.full_name}</td>
                <td>
                    <span class="badge ${this.getRoleBadgeClass(user.role)}">${this.formatRole(user.role)}</span>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td>
                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn" 
                                onclick="adminAccounts.editUser('${user.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning action-btn" 
                                onclick="adminAccounts.toggleUserStatus('${user.id}', ${user.is_active})">
                            <i class="bi ${user.is_active ? 'bi-pause' : 'bi-play'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger action-btn" 
                                onclick="adminAccounts.deleteUser('${user.id}')" 
                                ${user.username === 'admin' ? 'disabled' : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async addUser() {
        const form = document.getElementById('add-user-form');
        const formData = new FormData(form);

        // Validate passwords match
        if (formData.get('password') !== formData.get('confirm_password')) {
            this.showError('Passwords do not match');
            return;
        }

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php', {
                method: 'POST',
                body: formData
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
                form.reset();
                this.loadUsers();
                this.showSuccess('User created successfully');
            } else {
                this.showError(result.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showError('Network error while creating user');
        }
    }

    async editUser(userId) {
        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/users.php?id=${userId}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.currentUserId = userId;
                this.populateEditForm(result.data);
                const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showError('Failed to load user details');
        }
    }

    populateEditForm(user) {
        const form = document.getElementById('edit-user-form');
        form.querySelector('[name="user_id"]').value = user.id;
        form.querySelector('[name="username"]').value = user.username;
        form.querySelector('[name="role"]').value = user.role;
        form.querySelector('[name="full_name"]').value = user.full_name;
        form.querySelector('[name="email"]').value = user.email || '';
    }

    async updateUser() {
        const form = document.getElementById('edit-user-form');
        const formData = new FormData(form);

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php', {
                method: 'PUT',
                body: formData
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
                this.loadUsers();
                this.showSuccess('User updated successfully');
            } else {
                this.showError(result.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Network error while updating user');
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        const action = currentStatus ? 'deactivate' : 'activate';
        
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/users.php', {
                method: 'PATCH',
                body: JSON.stringify({
                    user_id: userId,
                    action: 'toggle_status'
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.loadUsers();
                this.showSuccess(`User ${action}d successfully`);
            } else {
                this.showError(result.message || `Failed to ${action} user`);
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showError('Network error while updating user status');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/users.php?id=${userId}`, {
                method: 'DELETE'
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.loadUsers();
                this.showSuccess('User deleted successfully');
            } else {
                this.showError(result.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Network error while deleting user');
        }
    }

    getRoleBadgeClass(role) {
        const roleClasses = {
            'admin': 'bg-danger',
            'approver': 'bg-warning',
            'citymayor': 'bg-primary'
        };
        return roleClasses[role] || 'bg-secondary';
    }

    formatRole(role) {
        const roleNames = {
            'admin': 'Administrator',
            'approver': 'Approver',
            'citymayor': 'City Mayor'
        };
        return roleNames[role] || role;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Global instance
let adminAccounts;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminAccounts = new AdminAccounts();
});