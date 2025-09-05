// Admin applicants management
class AdminApplicants {
    constructor() {
        this.currentApplicationId = null;
        this.init();
    }

    init() {
        this.loadApplicants();
        this.loadPrograms();
        this.setupEventListeners();
        this.startAutoRefresh();
    }
    
    startAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadApplicants();
        }, 30000);
    }

    setupEventListeners() {
        // Filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.loadApplicants();
        });


        // Modal actions
        document.getElementById('reject-application').addEventListener('click', () => {
            this.updateApplicationStatus('rejected');
        });

        document.getElementById('forward-application').addEventListener('click', () => {
            this.updateApplicationStatus('approved');
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

    async loadApplicants() {
        try {
            const filters = this.getFilters();
            const queryString = new URLSearchParams(filters).toString();
            
            const response = await adminAuth.makeAuthenticatedRequest(`../api/admin/applicants.php?${queryString}`);
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.renderApplicantsTable(result.data);
            }
        } catch (error) {
            console.error('Error loading applicants:', error);
            this.showError('Failed to load applicants data');
        }
    }

    getFilters() {
        return {
            program: document.getElementById('program-filter')?.value || '',
            status: document.getElementById('status-filter')?.value || '',
            date: document.getElementById('date-filter')?.value || ''
        };
    }

    renderApplicantsTable(applicants) {
        const tbody = document.getElementById('applicants-tbody');
        if (!tbody) return;

        if (applicants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No applicants found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = applicants.map(applicant => `
            <tr>
                <td>${this.formatDate(applicant.created_at)}</td>
                <td>
                    <span class="fw-bold text-primary">${applicant.reference_no}</span>
                </td>
                <td>${applicant.client_full_name}</td>
                <td>${applicant.beneficiary_full_name}</td>
                <td>
                    <span class="badge bg-light text-dark">${applicant.service_name}</span>
                </td>
                <td>
                    <span class="status-badge status-${this.getStatusClass(applicant.status)}">
                        ${applicant.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn" 
                                onclick="adminApplicants.viewApplication('${applicant.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info action-btn" 
                                onclick="adminApplicants.viewDocuments('${applicant.id}')">
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

    renderApplicationDetails(application) {
        const container = document.getElementById('application-details');
        if (!container) return;

        container.innerHTML = `
            <div class="application-form-view">
                <!-- I. Client's Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">I. Client's Identifying Information</h6>
                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group col-8">
                                <label>1. Client's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" value="${this.getLastName(application.client_full_name)}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${this.getFirstName(application.client_full_name)}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${this.getMiddleName(application.client_full_name)}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-4">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.client_sex === 'Male' ? 'checked' : ''} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.client_sex === 'Female' ? 'checked' : ''} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" value="${this.formatDateForForm(application.client_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.client_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.client_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <textarea readonly>${application.client_address}</textarea>
                                <div class="address-labels">
                                    <small>Region</small>
                                    <small>Province</small>
                                    <small>City/Municipality</small>
                                    <small>District</small>
                                    <small>Barangay</small>
                                    <small>No./Street/Purok</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-6">
                                <label>5. Place of Birth</label>
                                <input type="text" value="${application.client_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-6">
                                <label>6. Relationship to Beneficiary</label>
                                <input type="text" value="${application.relationship_to_beneficiary || ''}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-3">
                                <label>7. Civil Status</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.civil_status === 'Single' ? 'checked' : ''} disabled> Single
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.civil_status === 'Married' ? 'checked' : ''} disabled> Married
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${!['Single', 'Married'].includes(application.civil_status) ? 'checked' : ''} disabled> Other, Specify
                                    </label>
                                </div>
                                ${!['Single', 'Married'].includes(application.civil_status) ? `<input type="text" value="${application.civil_status}" readonly class="mt-1">` : ''}
                            </div>
                            <div class="form-group col-3">
                                <label>8. Religion</label>
                                <input type="text" value="${application.religion || ''}" readonly>
                            </div>
                            <div class="form-group col-3">
                                <label>9. Nationality</label>
                                <input type="text" value="${application.nationality || 'Filipino'}" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>10. Highest Educational Attainment</label>
                                <input type="text" value="${application.education || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>11. Skills/Occupation*</label>
                                <input type="text" value="${application.occupation || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>12. Estimated Monthly Income</label>
                                <div class="income-field">
                                    <span>₱</span>
                                    <input type="text" value="${this.formatCurrency(application.monthly_income)}" readonly>
                                    <span>.00</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>13. PhilHealth No.</label>
                                <input type="text" value="${application.philhealth_no || ''}" readonly>
                            </div>
                            <div class="form-group col-4">
                                <label>14. Mode of Admission*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.admission_mode === 'Walk-in' ? 'checked' : ''} disabled> Walk-in
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.admission_mode === 'Referral' ? 'checked' : ''} disabled> Referral
                                    </label>
                                </div>
                            </div>
                            <div class="form-group col-4">
                                <label>15. Referring party</label>
                                <input type="text" value="${application.referring_party || ''}" readonly>
                                <label class="mt-1">16. Contact #</label>
                                <input type="text" value="" readonly>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- II. Beneficiary Identifying Information -->
                <div class="form-section">
                    <h6 class="section-title">II. Beneficiary Identifying Information</h6>
                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group col-12">
                                <div class="category-checkboxes">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Informal Settler Family' ? 'checked' : ''} disabled> Informal Settler Family
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Disadvantaged Individual' ? 'checked' : ''} disabled> Disadvantaged Individual
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Indigenous People' ? 'checked' : ''} disabled> Indigenous People
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.category === 'Pantawid Beneficiary' ? 'checked' : ''} disabled> Pantawid Beneficiary
                                    </label>
                                    ${application.category === 'Pantawid Beneficiary' ? `
                                        <div class="id-field">
                                            <span>ID No.</span>
                                            <input type="text" value="${application.category_id_no || ''}" readonly>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-8">
                                <label>1. Beneficiary's Name*</label>
                                <div class="name-fields">
                                    <div class="field-group">
                                        <input type="text" value="${this.getLastName(application.beneficiary_full_name)}" readonly>
                                        <small>Last Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${this.getFirstName(application.beneficiary_full_name)}" readonly>
                                        <small>First Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="${this.getMiddleName(application.beneficiary_full_name)}" readonly>
                                        <small>Middle Name</small>
                                    </div>
                                    <div class="field-group">
                                        <input type="text" value="" readonly>
                                        <small>Ext (Jr,Sr)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group col-4">
                                <label>2. Sex*</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.beneficiary_sex === 'Male' ? 'checked' : ''} disabled> Male
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.beneficiary_sex === 'Female' ? 'checked' : ''} disabled> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-4">
                                <label>3. Date of Birth*</label>
                                <div class="date-fields">
                                    <input type="text" value="${this.formatDateForForm(application.beneficiary_dob, 'year')}" readonly>
                                    <small>YYYY</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.beneficiary_dob, 'month')}" readonly>
                                    <small>MM</small>
                                    <span>/</span>
                                    <input type="text" value="${this.formatDateForForm(application.beneficiary_dob, 'day')}" readonly>
                                    <small>DD</small>
                                </div>
                            </div>
                            <div class="form-group col-8">
                                <label>4. Present Address*</label>
                                <textarea readonly>${application.beneficiary_address}</textarea>
                                <div class="address-labels">
                                    <small>Region</small>
                                    <small>Province</small>
                                    <small>City/Municipality</small>
                                    <small>District</small>
                                    <small>Barangay</small>
                                    <small>No./Street/Purok</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-6">
                                <label>5. Place of Birth</label>
                                <input type="text" value="${application.beneficiary_place_of_birth || ''}" readonly>
                            </div>
                            <div class="form-group col-6">
                                <label>6. Civil Status</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.beneficiary_civil_status === 'Single' ? 'checked' : ''} disabled> Single
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${application.beneficiary_civil_status === 'Married' ? 'checked' : ''} disabled> Married
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" ${!['Single', 'Married'].includes(application.beneficiary_civil_status) ? 'checked' : ''} disabled> Other, Specify
                                    </label>
                                </div>
                                ${!['Single', 'Married'].includes(application.beneficiary_civil_status) ? `<input type="text" value="${application.beneficiary_civil_status}" readonly class="mt-1">` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- III. Beneficiary's Family Composition -->
                <div class="form-section">
                    <h6 class="section-title">III. Beneficiary's Family Composition</h6>
                    <div class="family-table-container">
                        <table class="family-table">
                            <thead>
                                <tr>
                                    <th rowspan="2">Last Name</th>
                                    <th rowspan="2">First Name</th>
                                    <th rowspan="2">Middle Name</th>
                                    <th rowspan="2">Sex</th>
                                    <th rowspan="2">Birthdate<br><small>yyyy/mm/dd</small></th>
                                    <th rowspan="2">Civil Status</th>
                                    <th rowspan="2">Relationship</th>
                                    <th rowspan="2">Highest Educational Attainment</th>
                                    <th rowspan="2">Skills / Occupation</th>
                                    <th rowspan="2">Est. Monthly Income</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderFamilyRows(application.family_members)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Application Information -->
                <div class="form-section">
                    <h6 class="section-title">Application Information</h6>
                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group col-6">
                                <label>Reference Number</label>
                                <input type="text" value="${application.reference_no}" readonly class="fw-bold text-primary">
                            </div>
                            <div class="form-group col-6">
                                <label>Service Type</label>
                                <input type="text" value="${application.service_name}" readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group col-6">
                                <label>Application Date</label>
                                <input type="text" value="${this.formatDate(application.created_at)}" readonly>
                            </div>
                            <div class="form-group col-6">
                                <label>Current Status</label>
                                <span class="status-badge status-${this.getStatusClass(application.status)}">
                                    ${application.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFamilyRows(familyMembers) {
        if (!familyMembers || familyMembers.length === 0) {
            return `
                <tr>
                    <td colspan="10" class="text-center text-muted py-3">No family members listed</td>
                </tr>
            `;
        }
        
        // Create 5 rows minimum
        const rows = [];
        for (let i = 0; i < Math.max(5, familyMembers.length); i++) {
            const member = familyMembers[i] || {};
            rows.push(`
                <tr>
                    <td><input type="text" value="${this.getLastName(member.full_name || '')}" readonly></td>
                    <td><input type="text" value="${this.getFirstName(member.full_name || '')}" readonly></td>
                    <td><input type="text" value="${this.getMiddleName(member.full_name || '')}" readonly></td>
                    <td><input type="text" value="${member.sex || ''}" readonly></td>
                    <td><input type="text" value="${member.birthdate ? this.formatDateForForm(member.birthdate, 'full') : ''}" readonly></td>
                    <td><input type="text" value="${member.civil_status || ''}" readonly></td>
                    <td><input type="text" value="${member.relationship || ''}" readonly></td>
                    <td><input type="text" value="${member.education || ''}" readonly></td>
                    <td><input type="text" value="${member.occupation || ''}" readonly></td>
                    <td><input type="text" value="${member.monthly_income ? this.formatCurrency(member.monthly_income) : ''}" readonly></td>
                </tr>
            `);
        }
        return rows.join('');
    }
    
    getLastName(fullName) {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        return parts[0] || '';
    }
    
    getFirstName(fullName) {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        return parts[1] || '';
    }
    
    getMiddleName(fullName) {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        return parts.slice(2).join(' ') || '';
    }
    
    formatDateForForm(dateString, part) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (part === 'year') return date.getFullYear().toString();
        if (part === 'month') return (date.getMonth() + 1).toString().padStart(2, '0');
        if (part === 'day') return date.getDate().toString().padStart(2, '0');
        if (part === 'full') return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        return '';
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

    async updateApplicationStatus(status) {
        if (!this.currentApplicationId) return;

        try {
            const response = await adminAuth.makeAuthenticatedRequest('../api/admin/update-status.php', {
                method: 'POST',
                body: JSON.stringify({
                    application_id: this.currentApplicationId,
                    status: status,
                    action: status === 'approved' ? 'forward_to_interview' : 'reject'
                })
            });

            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('applicationModal'));
                modal.hide();
                
                // Reload data
                this.loadApplicants();
                
                // Show success message
                this.showSuccess(`Application ${status === 'approved' ? 'forwarded to interview' : 'rejected'} successfully`);
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
let adminApplicants;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminApplicants = new AdminApplicants();
});