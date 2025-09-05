// Admin beneficiaries management
class AdminBeneficiaries {
    constructor() {
        this.currentApplicationId = null;
        this.init();
    }

    init() {
        this.loadBeneficiaries();
        this.loadStats();
        this.setupEventListeners();
        this.startAutoRefresh();
    }
    
    startAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadBeneficiaries();
            this.loadStats();
        }, 30000);
    }

    setupEventListeners() {

        document.getElementById('confirm-notification').addEventListener('click', () => {
            this.sendNotification();
        });
    }

    async loadStats() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/beneficiaries-stats.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.updateStatsCards(result.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsCards(data) {
        document.getElementById('ready-for-release').textContent = data.ready_for_release || 0;
        document.getElementById('released-today').textContent = data.released_today || 0;
        document.getElementById('released-this-week').textContent = data.released_this_week || 0;
        document.getElementById('released-this-month').textContent = data.released_this_month || 0;
    }

    async loadBeneficiaries() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/beneficiaries.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderBeneficiariesTable(result.data);
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
            this.showError('Failed to load beneficiaries data');
        }
    }

    renderBeneficiariesTable(beneficiaries) {
        const tbody = document.getElementById('beneficiaries-tbody');
        if (!tbody) return;

        if (beneficiaries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No beneficiaries found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = beneficiaries.map(beneficiary => `
            <tr>
                <td>${this.formatDate(beneficiary.updated_at)}</td>
                <td>
                    <span class="fw-bold text-primary">${beneficiary.reference_no}</span>
                </td>
                <td>${beneficiary.beneficiary_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${beneficiary.service_name}</span>
                </td>
                <td>
                    <span class="status-badge status-${this.getStatusClass(beneficiary.status)}">
                        ${beneficiary.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        ${beneficiary.status === 'Ready for release' ? `
                            <button class="btn btn-sm btn-outline-success action-btn" 
                                    onclick="adminBeneficiaries.notifyBeneficiary('${beneficiary.id}')">
                                <i class="bi bi-envelope"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary action-btn" 
                                    onclick="adminBeneficiaries.markAsReleased('${beneficiary.id}')">
                                <i class="bi bi-check-circle"></i>
                            </button>
                        ` : `
                            <span class="text-muted small">Released</span>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async notifyBeneficiary(applicationId) {
        this.currentApplicationId = applicationId;
        const modal = new bootstrap.Modal(document.getElementById('notificationModal'));
        modal.show();
    }

    async sendNotification() {
        if (!this.currentApplicationId) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/notify-beneficiary.php', {
                method: 'POST',
                body: JSON.stringify({
                    application_id: this.currentApplicationId
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('notificationModal'));
                modal.hide();
                this.showSuccess('Notification sent successfully');
            } else {
                this.showError(result.message || 'Failed to send notification');
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            this.showError('Network error while sending notification');
        }
    }

    async markAsReleased(applicationId) {
        if (!confirm('Mark this assistance as released?')) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/mark-released.php', {
                method: 'POST',
                body: JSON.stringify({
                    application_id: applicationId
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.loadBeneficiaries();
                this.loadStats();
                this.showSuccess('Application marked as released');
            } else {
                this.showError(result.message || 'Failed to mark as released');
            }
        } catch (error) {
            console.error('Error marking as released:', error);
            this.showError('Network error while updating status');
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getStatusClass(status) {
        const statusMap = {
            'Ready for release': 'ready',
            'Released': 'approved'
        };
        return statusMap[status] || 'pending';
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
let adminBeneficiaries;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminBeneficiaries = new AdminBeneficiaries();
});