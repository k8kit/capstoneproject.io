// Application tracking functionality
class TrackingPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Track form submission
        document.getElementById('track-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.trackApplication();
        });

        // Forgot reference form submission
        document.getElementById('forgot-ref-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendReferenceNumber();
        });
    }

    // Helper: safely parse JSON
    async parseJsonSafe(response) {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (err) {
            console.error("Invalid JSON response:", text);
            utils.showAlert("Server error: Invalid response format", "danger");
            return null;
        }
    }

    async trackApplication() {
        const referenceNumber = document.getElementById('reference-input').value.trim();
        
        if (!referenceNumber) {
            utils.showAlert('Please enter your reference number', 'warning');
            return;
        }

        try {
            const response = await fetch('api/track.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference_number: referenceNumber })
            });

            const result = await this.parseJsonSafe(response);
            if (!result) return; // stop if JSON invalid
            
            if (result.success) {
                this.displayApplicationDetails(result.data);
            } else {
                this.showNoResults(result.message || 'Application not found');
            }
        } catch (error) {
            console.error('Tracking error:', error);
            utils.showAlert('Network error while tracking application', 'danger');
        }
    }

    async sendReferenceNumber() {
        const email = document.getElementById('email-input').value.trim();
        
        if (!email) {
            utils.showAlert('Please enter your email address', 'warning');
            return;
        }

        const submitBtn = document.querySelector('#forgot-ref-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner me-2"></span>Sending...';

        try {
            const response = await fetch('api/track.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'forgot_reference', email })
            });

            const result = await this.parseJsonSafe(response);
            if (!result) return; // stop if JSON invalid

            if (result.success) {
                utils.showAlert('Reference number sent to your email address', 'success');
                document.getElementById('email-input').value = '';
            } else {
                utils.showAlert(result.message || 'Email not found in our records', 'warning');
            }
        } catch (error) {
            console.error('Email error:', error);
            utils.showAlert('Network error while sending email', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    displayApplicationDetails(application) {
        const resultsSection = document.getElementById('results-section');
        const detailsContainer = document.getElementById('application-details');
        
        const statusClass = this.getStatusClass(application.status);
        const statusIcon = this.getStatusIcon(application.status);
        
        detailsContainer.innerHTML = `
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="bi bi-file-earmark-text me-2"></i>
                    Application Details - ${application.reference_no}
                </h5>
            </div>
            <div class="card-body">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="text-success">Current Status</h6>
                        <span class="status-badge ${statusClass}">
                            <i class="bi ${statusIcon} me-1"></i>
                            ${application.status}
                        </span>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-success">Submitted On</h6>
                        <p class="mb-0">${utils.formatDate(application.created_at)}</p>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="text-success">Service Type</h6>
                        <p class="mb-0">${application.service_name || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-success">Applicant</h6>
                        <p class="mb-0">${application.client_full_name}</p>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="text-success">Beneficiary</h6>
                        <p class="mb-0">${application.beneficiary_full_name}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-success">Category</h6>
                        <p class="mb-0">${application.category}</p>
                    </div>
                </div>

                ${this.renderStatusTimeline(application.status)}
                
                <div class="alert alert-info mt-4">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>What's Next?</strong> ${this.getNextStepMessage(application.status)}
                </div>
            </div>
        `;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    showNoResults(message) {
        const resultsSection = document.getElementById('results-section');
        const detailsContainer = document.getElementById('application-details');
        
        detailsContainer.innerHTML = `
            <div class="card-body text-center py-5">
                <i class="bi bi-search" style="font-size: 4rem; color: #6c757d;"></i>
                <h5 class="mt-3 text-muted">${message}</h5>
                <p class="text-muted">Please check your reference number and try again.</p>
                <a href="apply.html" class="btn btn-primary">
                    <i class="bi bi-plus-circle me-2"></i>Submit New Application
                </a>
            </div>
        `;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    renderStatusTimeline(currentStatus) {
        const statuses = [
            { key: 'Pending for approval', label: 'Application Submitted', icon: 'bi-check-circle' },
            { key: 'Approved', label: 'Initial Approval', icon: 'bi-person-check' },
            { key: 'Waiting for approval of heads/city mayor', label: 'Awaiting Final Approval', icon: 'bi-hourglass-split' },
            { key: 'Ready for release', label: 'Ready for Release', icon: 'bi-gift' },
            { key: 'Rejected', label: 'Application Rejected', icon: 'bi-x-circle' }
        ];

        // Filter out rejected status unless that's the current status
        const timelineStatuses = currentStatus === 'Rejected' 
            ? [statuses[0], statuses[4]] 
            : statuses.slice(0, 4);

        return `
            <div class="mt-4">
                <h6 class="text-success">Status Timeline</h6>
                <div class="timeline">
                    ${timelineStatuses.map((status) => {
                        const isActive = currentStatus === status.key;
                        const isCompleted = this.isStatusCompleted(currentStatus, status.key);
                        const statusClass = isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted';
                        
                        return `
                            <div class="timeline-item ${statusClass} mb-3">
                                <div class="d-flex align-items-center">
                                    <div class="timeline-icon me-3">
                                        <i class="bi ${status.icon}"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">${status.label}</h6>
                                        ${isActive ? '<small class="text-primary">Current Status</small>' : ''}
                                        ${isCompleted ? '<small class="text-success">Completed</small>' : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    isStatusCompleted(currentStatus, checkStatus) {
        const statusOrder = [
            'Pending for approval',
            'Approved',
            'Waiting for approval of heads/city mayor',
            'Ready for release'
        ];

        const currentIndex = statusOrder.indexOf(currentStatus);
        const checkIndex = statusOrder.indexOf(checkStatus);
        
        return currentIndex > checkIndex;
    }

    getStatusClass(status) {
        const statusMap = {
            'Pending for approval': 'status-pending',
            'Approved': 'status-approved',
            'Rejected': 'status-rejected',
            'Waiting for approval of heads/city mayor': 'status-waiting',
            'Ready for release': 'status-ready'
        };
        
        return statusMap[status] || 'status-pending';
    }

    getStatusIcon(status) {
        const iconMap = {
            'Pending for approval': 'bi-clock',
            'Approved': 'bi-check-circle',
            'Rejected': 'bi-x-circle',
            'Waiting for approval of heads/city mayor': 'bi-hourglass-split',
            'Ready for release': 'bi-gift'
        };
        
        return iconMap[status] || 'bi-clock';
    }

    getNextStepMessage(status) {
        const messages = {
            'Pending for approval': 'Your application is under review. You will be notified once it has been processed.',
            'Approved': 'Your application has been approved and is now waiting for final authorization.',
            'Rejected': 'Unfortunately, your application was not approved. You may submit a new application if your circumstances have changed.',
            'Waiting for approval of heads/city mayor': 'Your application is awaiting final approval from the city mayor. This process may take a few business days.',
            'Ready for release': 'Great news! Your assistance is ready for release. Please visit our office to claim your assistance.'
        };
        
        return messages[status] || 'We are processing your application. Please check back later for updates.';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrackingPage();
});
