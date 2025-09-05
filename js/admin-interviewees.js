// Admin interviewees management
class AdminInterviewees {
    constructor() {
        this.currentApplicationId = null;
        this.init();
    }

    init() {
        this.loadInterviewees();
        this.loadPrograms();
        this.setupEventListeners();
        this.startAutoRefresh();
    }
    
    startAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadInterviewees();
        }, 30000);
    }

    setupEventListeners() {
        // Filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.loadInterviewees();
        });


        // Modal actions
        document.getElementById('reject-interviewee').addEventListener('click', () => {
            this.updateApplicationStatus('rejected');
        });

        document.getElementById('forward-to-approver').addEventListener('click', () => {
            this.updateApplicationStatus('waiting');
        });
    }

    async loadPrograms() {
        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/programs.php');
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderProgramFilter(result.data);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }

    renderProgramFilter(programs) {
        const filter = document.getElementById('program-filter');
        if (!filter) return;

        const options = programs.map(program => 
            `<option value="${program.id}">${program.name}</option>`
        ).join('');

        filter.innerHTML = '<option value="">All Programs</option>' + options;
    }

    async loadInterviewees() {
        try {
            const filters = this.getFilters();
            const queryString = new URLSearchParams(filters).toString();
            
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/interviewees.php?${queryString}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderIntervieweesTable(result.data);
            }
        } catch (error) {
            console.error('Error loading interviewees:', error);
            this.showError('Failed to load interviewees data');
        }
    }

    getFilters() {
        return {
            program: document.getElementById('program-filter')?.value || '',
            date: document.getElementById('date-filter')?.value || ''
        };
    }

    renderIntervieweesTable(interviewees) {
        const tbody = document.getElementById('interviewees-tbody');
        if (!tbody) return;

        if (interviewees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No interviewees found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = interviewees.map(interviewee => `
            <tr>
                <td>${this.formatDate(interviewee.created_at)}</td>
                <td>
                    <span class="fw-bold text-primary">${interviewee.reference_no}</span>
                </td>
                <td>${interviewee.client_full_name}</td>
                <td>${interviewee.beneficiary_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${interviewee.service_name}</span>
                </td>
                <td>
                    <span class="status-badge status-${this.getStatusClass(interviewee.status)}">
                        ${interviewee.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn" 
                                onclick="adminInterviewees.viewApplication('${interviewee.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info action-btn" 
                                onclick="adminInterviewees.viewDocuments('${interviewee.id}')">
                            <i class="bi bi-files"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async viewApplication(applicationId) {
        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/application-details.php?id=${applicationId}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.currentApplicationId = applicationId;
                this.renderApplicationDetails(result.data);
                const modal = new bootstrap.Modal(document.getElementById('applicationModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading application details:', error);
            this.showError('Failed to load application details');
        }
    }

    async viewDocuments(applicationId) {
        try {
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/documents.php?application_id=${applicationId}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderDocuments(result.data);
                const modal = new bootstrap.Modal(document.getElementById('documentsModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showError('Failed to load documents');
        }
    }

    renderDocuments(documents) {
        const container = document.getElementById('documents-content');
        if (!container) return;

        if (documents.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-files" style="font-size: 3rem;"></i>
                    <p class="mt-2">No documents uploaded</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-3">
                ${documents.map(doc => `
                    <div class="col-md-6">
                        <div class="document-item border rounded p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${doc.file_name}</h6>
                                    <small class="text-muted">
                                        <i class="bi bi-calendar me-1"></i>
                                        ${this.formatDate(doc.uploaded_at)}
                                    </small>
                                </div>
                                <div class="btn-group">
                                    <a href="../${doc.file_path}" target="_blank" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                    <a href="../${doc.file_path}" download class="btn btn-sm btn-outline-success">
                                        <i class="bi bi-download"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderApplicationDetails(application) {
        const container = document.getElementById('application-details');
        if (!container) return;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary border-start-primary ps-3 mb-3">Client Information</h6>
                    <div class="info-group">
                        <strong>Name:</strong> ${application.client_full_name}<br>
                        <strong>Sex:</strong> ${application.client_sex}<br>
                        <strong>Date of Birth:</strong> ${this.formatDate(application.client_dob)}<br>
                        <strong>Address:</strong> ${application.client_address}<br>
                        <strong>Email:</strong> ${application.email}<br>
                        <strong>Monthly Income:</strong> ₱${this.formatCurrency(application.monthly_income)}
                    </div>
                </div>
                <div class="col-md-6">
                    <h6 class="text-success border-start-success ps-3 mb-3">Beneficiary Information</h6>
                    <div class="info-group">
                        <strong>Name:</strong> ${application.beneficiary_full_name}<br>
                        <strong>Sex:</strong> ${application.beneficiary_sex}<br>
                        <strong>Date of Birth:</strong> ${this.formatDate(application.beneficiary_dob)}<br>
                        <strong>Address:</strong> ${application.beneficiary_address}<br>
                        <strong>Category:</strong> ${application.category}<br>
                        <strong>Civil Status:</strong> ${application.beneficiary_civil_status}
                    </div>
                </div>
            </div>
            
            <hr class="my-4">
            
            <div class="row">
                <div class="col-12">
                    <h6 class="text-info border-start-info ps-3 mb-3">Service Information</h6>
                    <div class="info-group">
                        <strong>Service Type:</strong> ${application.service_name}<br>
                        <strong>Reference Number:</strong> ${application.reference_no}<br>
                        <strong>Application Date:</strong> ${this.formatDate(application.created_at)}<br>
                        <strong>Current Status:</strong> 
                        <span class="status-badge status-${this.getStatusClass(application.status)}">
                            ${application.status}
                        </span>
                    </div>
                </div>
            </div>

            ${application.family_members && application.family_members.length > 0 ? `
                <hr class="my-4">
                <h6 class="text-warning border-start-warning ps-3 mb-3">Family Composition</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Sex</th>
                                <th>Birthdate</th>
                                <th>Relationship</th>
                                <th>Occupation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${application.family_members.map(member => `
                                <tr>
                                    <td>${member.full_name}</td>
                                    <td>${member.sex || 'N/A'}</td>
                                    <td>${member.birthdate ? this.formatDate(member.birthdate) : 'N/A'}</td>
                                    <td>${member.relationship || 'N/A'}</td>
                                    <td>${member.occupation || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        `;
    }

    async updateApplicationStatus(status) {
        if (!this.currentApplicationId) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/update-status.php', {
                method: 'POST',
                body: JSON.stringify({
                    application_id: this.currentApplicationId,
                    status: status,
                    action: status === 'waiting' ? 'forward_to_approver' : 'reject'
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('applicationModal'));
                modal.hide();
                
                // Reload data
                this.loadInterviewees();
                
                // Show success message
                this.showSuccess(`Application ${status === 'waiting' ? 'forwarded to approver' : 'rejected'} successfully`);
            } else {
                this.showError(result.message || 'Failed to update application status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
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

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH').format(amount || 0);
    }

    getStatusClass(status) {
        const statusMap = {
            'Pending for approval': 'pending',
            'Approved': 'approved',
            'Rejected': 'rejected',
            'Waiting for approval of heads/city mayor': 'waiting',
            'Ready for release': 'ready'
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
let adminInterviewees;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminInterviewees = new AdminInterviewees();
});