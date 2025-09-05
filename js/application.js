// Application form functionality
class ApplicationForm {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.uploadedFiles = [];
        this.selectedService = null;
        
        this.init();
    }

    init() {
        this.loadServices();
        this.setupEventListeners();
        this.checkURLParams();
        this.addInitialFamilyMember();
    }

    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('service');
        if (serviceId) {
            this.preSelectService(serviceId);
        }
    }

    async preSelectService(serviceId) {
        // Wait a bit for services to load
        setTimeout(() => {
            const serviceCard = document.querySelector(`[data-service-id="${serviceId}"]`);
            if (serviceCard) {
                serviceCard.click();
            }
        }, 500);
    }

    setupEventListeners() {
        // Step navigation
        document.getElementById('next-step-1').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step-2').addEventListener('click', () => this.prevStep());
        document.getElementById('next-step-2').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step-3').addEventListener('click', () => this.prevStep());
        document.getElementById('next-step-3').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step-4').addEventListener('click', () => this.prevStep());

        // Form submission
        document.getElementById('application-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitApplication();
        });

        // Family member management
        document.getElementById('add-family-member').addEventListener('click', () => {
            this.addFamilyMember();
        });

        // Category selection
        document.querySelectorAll('input[name="category"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const pantawidSection = document.getElementById('pantawid-id');
                if (radio.value === 'Pantawid Beneficiary' && radio.checked) {
                    pantawidSection.style.display = 'block';
                } else {
                    pantawidSection.style.display = 'none';
                }
            });
        });

        // File upload
        this.setupFileUpload();
    }

    async loadServices() {
        try {
            const response = await fetch('api/programs.php');
            const programs = await response.json();
            
            if (programs.success) {
                this.renderServices(programs.data);
            } else {
                this.showError('Failed to load services');
            }
        } catch (error) {
            console.error('Error loading services:', error);
            this.showError('Network error while loading services');
        }
    }

    renderServices(services) {
        const container = document.getElementById('service-options');
        if (!container) return;

        container.innerHTML = services.map(service => `
            <div class="col-md-6 col-lg-4">
                <div class="card service-option h-100" data-service-id="${service.id}">
                    <div class="card-body text-center p-4">
                        <div class="program-icon bg-primary text-white mb-3">
                            <i class="bi ${this.getProgramIcon(service.name)}"></i>
                        </div>
                        <h6 class="card-title fw-bold">${service.name}</h6>
                        <p class="card-text small text-muted">${service.description}</p>
                        <input type="radio" name="service_type" value="${service.id}" data-requirements="${service.requirements}">
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for service selection
        document.querySelectorAll('.service-option').forEach(card => {
            card.addEventListener('click', () => {
                this.selectService(card);
            });
        });
    }

    selectService(selectedCard) {
        // Remove previous selections
        document.querySelectorAll('.service-option').forEach(card => {
            card.classList.remove('selected');
        });

        // Select current card
        selectedCard.classList.add('selected');
        const radio = selectedCard.querySelector('input[type="radio"]');
        radio.checked = true;
        
        this.selectedService = {
            id: radio.value,
            requirements: radio.dataset.requirements
        };

        // Enable next button
        document.getElementById('next-step-1').disabled = false;
    }

    addInitialFamilyMember() {
        this.addFamilyMember();
    }

    addFamilyMember() {
        const tbody = document.getElementById('family-tbody');
        const row = document.createElement('tr');
        const rowIndex = tbody.children.length;

        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" name="family_name_${rowIndex}" placeholder="Full Name"></td>
            <td>
                <select class="form-select form-select-sm" name="family_sex_${rowIndex}">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
            </td>
            <td><input type="date" class="form-control form-control-sm" name="family_birthdate_${rowIndex}"></td>
            <td>
                <select class="form-select form-select-sm" name="family_civil_status_${rowIndex}">
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm" name="family_relationship_${rowIndex}" placeholder="Relationship"></td>
            <td><input type="text" class="form-control form-control-sm" name="family_education_${rowIndex}" placeholder="Education"></td>
            <td><input type="text" class="form-control form-control-sm" name="family_occupation_${rowIndex}" placeholder="Occupation"></td>
            <td><input type="number" class="form-control form-control-sm" name="family_income_${rowIndex}" step="0.01" placeholder="0.00"></td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    }

    setupFileUpload() {
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('file-upload');

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                this.uploadFile(file);
            }
        });
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (file.size > maxSize) {
            utils.showAlert('File size must be less than 10MB', 'warning');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            utils.showAlert('Only PDF, JPG, and PNG files are allowed', 'warning');
            return false;
        }

        return true;
    }

    async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('api/upload.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        // Make sure result.data.path exists!
        if (result.success && result.data && result.data.path) {
            this.uploadedFiles.push({
                name: file.name,
                path: result.data.path, // <-- This is critical!
                type: file.type,
                size: file.size
            });
            this.renderUploadedFiles();
        } else {
            utils.showAlert(result.message || 'Upload failed', 'danger');
        }
    } catch (error) {
        console.error('Upload error:', error);
        utils.showAlert('Network error during upload', 'danger');
    }
}

    renderUploadedFiles() {
        const container = document.getElementById('uploaded-files');
        if (!container) return;

        container.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="col-md-6 col-lg-4">
                <div class="file-item">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${file.name}</h6>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="applicationForm.removeFile(${index})">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <small class="text-muted">
                        <i class="bi bi-file-earmark me-1"></i>
                        ${this.formatFileSize(file.size)}
                    </small>
                </div>
            </div>
        `).join('');
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderUploadedFiles();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.showStep(this.currentStep);
            this.updateProgress();

            if (this.currentStep === 3) {
                this.loadRequirements();
            } else if (this.currentStep === 4) {
                this.generateReview();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgress();
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        document.getElementById(`step-${stepNumber}`).classList.add('active');

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            
            if (index + 1 === stepNumber) {
                indicator.classList.add('active');
            } else if (index + 1 < stepNumber) {
                indicator.classList.add('completed');
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateProgress() {
        const progressPercent = (this.currentStep / this.totalSteps) * 100;
        document.getElementById('progress-bar').style.width = progressPercent + '%';
    }

    validateCurrentStep() {
        if (this.currentStep === 1) {
            if (!this.selectedService) {
                utils.showAlert('Please select a service/program', 'warning');
                return false;
            }
        } else if (this.currentStep === 2) {
            const requiredFields = document.querySelectorAll('#step-2 [required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });

            if (!isValid) {
                utils.showAlert('Please fill in all required fields', 'warning');
                return false;
            }

            // Validate at least one category is selected
            const categorySelected = document.querySelector('input[name="category"]:checked');
            if (!categorySelected) {
                utils.showAlert('Please select a beneficiary category', 'warning');
                return false;
            }
        }

        return true;
    }

    loadRequirements() {
        if (!this.selectedService) return;

        const container = document.getElementById('requirements-list');
        const requirements = this.selectedService.requirements.split(',').map(req => req.trim());
        
        container.innerHTML = `
            <div class="list-group">
                ${requirements.map((req, index) => `
                    <div class="list-group-item">
                        <i class="bi bi-file-earmark-text text-primary me-2"></i>
                        ${req}
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateReview() {
        const formData = new FormData(document.getElementById('application-form'));
        const reviewContainer = document.getElementById('review-content');
        
        // Get family members data
        const familyMembers = this.getFamilyMembersData();
        
        reviewContainer.innerHTML = `
            <div class="accordion" id="reviewAccordion">
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingService">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseService">
                            <i class="bi bi-clipboard-check me-2"></i>Selected Service
                        </button>
                    </h2>
                    <div id="collapseService" class="accordion-collapse collapse show" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            <div class="d-flex justify-content-between">
                                <span>Program:</span>
                                <strong>${document.querySelector('input[name="service_type"]:checked')?.closest('.service-option').querySelector('.card-title').textContent || 'Not selected'}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingClient">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseClient">
                            <i class="bi bi-person me-2"></i>Client Information
                        </button>
                    </h2>
                    <div id="collapseClient" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            <div class="row g-2">
                                <div class="col-12"><strong>Name:</strong> ${formData.get('client_last_name')}, ${formData.get('client_first_name')} ${formData.get('client_middle_name') || ''}</div>
                                <div class="col-md-6"><strong>Sex:</strong> ${formData.get('client_sex')}</div>
                                <div class="col-md-6"><strong>Date of Birth:</strong> ${formData.get('client_dob')}</div>
                                <div class="col-12"><strong>Address:</strong> ${formData.get('client_address')}</div>
                                <div class="col-md-6"><strong>Civil Status:</strong> ${formData.get('civil_status')}</div>
                                <div class="col-md-6"><strong>Email:</strong> ${formData.get('email')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingBeneficiary">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseBeneficiary">
                            <i class="bi bi-person-heart me-2"></i>Beneficiary Information
                        </button>
                    </h2>
                    <div id="collapseBeneficiary" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            <div class="row g-2">
                                <div class="col-12"><strong>Name:</strong> ${formData.get('beneficiary_last_name')}, ${formData.get('beneficiary_first_name')} ${formData.get('beneficiary_middle_name') || ''}</div>
                                <div class="col-md-6"><strong>Category:</strong> ${formData.get('category')}</div>
                                <div class="col-md-6"><strong>Sex:</strong> ${formData.get('beneficiary_sex')}</div>
                                <div class="col-12"><strong>Address:</strong> ${formData.get('beneficiary_address')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingFamily">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFamily">
                            <i class="bi bi-people me-2"></i>Family Composition (${familyMembers.length} members)
                        </button>
                    </h2>
                    <div id="collapseFamily" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            ${familyMembers.length > 0 ? this.renderFamilyReview(familyMembers) : 'No family members added'}
                        </div>
                    </div>
                </div>

                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingDocuments">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDocuments">
                            <i class="bi bi-files me-2"></i>Uploaded Documents (${this.uploadedFiles.length} files)
                        </button>
                    </h2>
                    <div id="collapseDocuments" class="accordion-collapse collapse" data-bs-parent="#reviewAccordion">
                        <div class="accordion-body">
                            ${this.uploadedFiles.length > 0 ? this.renderDocumentsReview() : 'No documents uploaded'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFamilyMembersData() {
        const tbody = document.getElementById('family-tbody');
        const familyMembers = [];
        
        Array.from(tbody.children).forEach((row, index) => {
            const inputs = row.querySelectorAll('input, select');
            const member = {};
            
            inputs.forEach(input => {
                if (input.name && input.value.trim()) {
                    const fieldName = input.name.replace(`_${index}`, '').replace('family_', '');
                    member[fieldName] = input.value.trim();
                }
            });

            if (Object.keys(member).length > 0) {
                familyMembers.push(member);
            }
        });

        return familyMembers;
    }

    renderFamilyReview(familyMembers) {
        return `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Sex</th>
                            <th>Birthdate</th>
                            <th>Relationship</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${familyMembers.map(member => `
                            <tr>
                                <td>${member.name || ''}</td>
                                <td>${member.sex || ''}</td>
                                <td>${member.birthdate || ''}</td>
                                <td>${member.relationship || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDocumentsReview() {
        return `
            <div class="list-group">
                ${this.uploadedFiles.map(file => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi bi-file-earmark me-2"></i>
                            ${file.name}
                        </div>
                        <small class="text-muted">${this.formatFileSize(file.size)}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    
    async submitApplication() {
        const submitBtn = document.getElementById('submit-application');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner me-2"></span>Submitting...';
        console.log('Files to upload:', this.uploadedFiles);

        try {
            const formData = new FormData(document.getElementById('application-form'));
            
            // Add uploaded files
            formData.append('uploaded_files', JSON.stringify(this.uploadedFiles));

            // Add family members
            formData.append('family_members', JSON.stringify(this.getFamilyMembersData()));
            for (let pair of formData.entries()) {
                console.log(pair[0]+ ': ' + pair[1]);
            }

            const response = await fetch('api/apply.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('API response:', result); // <-- Add this line
            if (result.success) {
                document.getElementById('reference-number').textContent = result.data.reference_number;
                const modal = new bootstrap.Modal(document.getElementById('successModal'));
                modal.show();
            } else {
                utils.showAlert(result.message || 'Application submission failed', 'danger');
            }
        } catch (error) {
            console.error('Submission error:', error);
            utils.showAlert('Network error during submission', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send me-2"></i>Submit Application';
        }
    }

    getProgramIcon(programName) {
        const iconMap = {
            'Transportation Assistance': 'bi-car-front',
            'Medical Assistance': 'bi-heart-pulse',
            'Burial Assistance': 'bi-flower1',
            'PWD Assistance': 'bi-universal-access',
            'Issuance of Case Study Report (Medical Assistance)': 'bi-file-medical',
            'Issuance of Case Study Report (Financial Assistance)': 'bi-file-earmark-money',
            'Issuance of Case Study Report (Guarantee Letter)': 'bi-file-earmark-check',
            'Referral/Endorsement Letter for Consultation': 'bi-file-earmark-person',
            'Endorsement Letter for Laboratory Services & Minor Procedures': 'bi-file-earmark-medical'
        };
        
        return iconMap[programName] || 'bi-clipboard-heart';
    }

    showError(message) {
        utils.showAlert(message, 'danger');
    }
}

// Global variable to access from HTML onclick handlers
let applicationForm;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    applicationForm = new ApplicationForm();
});