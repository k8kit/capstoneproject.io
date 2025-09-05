// Admin analytics functionality
class AdminAnalytics {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        this.setupDateFilters();
        this.loadAnalyticsData();
        this.setupCharts();
        this.setupEventListeners();
        this.startAutoRefresh();
    }
    
    startAutoRefresh() {
        // Auto-refresh every 60 seconds for analytics
        setInterval(() => {
            this.loadAnalyticsData();
        }, 60000);
    }

    setupDateFilters() {
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        document.getElementById('from-date').value = lastMonth.toISOString().split('T')[0];
        document.getElementById('to-date').value = today.toISOString().split('T')[0];
    }

    setupEventListeners() {
        document.getElementById('apply-date-filter').addEventListener('click', () => {
            this.loadAnalyticsData();
        });

        document.getElementById('export-report').addEventListener('click', () => {
            this.exportReport();
        });
    }

    async loadAnalyticsData() {
        try {
            const fromDate = document.getElementById('from-date').value;
            const toDate = document.getElementById('to-date').value;
            
            const response = await adminAuth.makeAuthenticatedRequest(
                `../api/admin/analytics.php?from_date=${fromDate}&to_date=${toDate}`
            );
            if (!response) return;

            const result = await response.json();
            
            if (result.success) {
                this.updateAnalytics(result.data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    updateAnalytics(data) {
        // Update descriptive analytics
        document.getElementById('total-applications').textContent = data.total_applications || 0;
        document.getElementById('total-beneficiaries').textContent = data.total_beneficiaries || 0;
        document.getElementById('approval-rate').textContent = (data.approval_rate || 0) + '%';
        document.getElementById('avg-processing-time').textContent = (data.avg_processing_time || 0) + ' days';

        // Update charts
        this.updateCharts(data);
        
        // Update predictions
        document.getElementById('forecast-percentage').textContent = (data.forecast_percentage || 15) + '%';
        document.getElementById('spike-period').textContent = data.spike_period || 'December-January';
    }

    setupCharts() {
        // Application Trends Chart
        const trendsCtx = document.getElementById('trendsChart');
        if (trendsCtx) {
            this.charts.trends = new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Applications Submitted',
                        data: [],
                        borderColor: 'rgba(13, 110, 253, 1)',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Applications Approved',
                        data: [],
                        borderColor: 'rgba(25, 135, 84, 1)',
                        backgroundColor: 'rgba(25, 135, 84, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Programs Chart
        const programsCtx = document.getElementById('programsChart');
        if (programsCtx) {
            this.charts.programs = new Chart(programsCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0',
                            '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Performance Chart
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            this.charts.performance = new Chart(performanceCtx, {
                type: 'radar',
                data: {
                    labels: ['Processing Speed', 'Approval Rate', 'User Satisfaction', 'Document Quality', 'Response Time'],
                    datasets: [{
                        label: 'Performance Metrics',
                        data: [85, 92, 88, 90, 87],
                        borderColor: 'rgba(13, 110, 253, 1)',
                        backgroundColor: 'rgba(13, 110, 253, 0.2)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        // Seasonal Chart
        const seasonalCtx = document.getElementById('seasonalChart');
        if (seasonalCtx) {
            this.charts.seasonal = new Chart(seasonalCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Historical Average',
                        data: [],
                        backgroundColor: 'rgba(108, 117, 125, 0.8)',
                        borderColor: 'rgba(108, 117, 125, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Forecast Chart
        const forecastCtx = document.getElementById('forecastChart');
        if (forecastCtx) {
            this.charts.forecast = new Chart(forecastCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Historical Data',
                        data: [],
                        borderColor: 'rgba(13, 110, 253, 1)',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }, {
                        label: 'Predicted',
                        data: [],
                        borderColor: 'rgba(255, 193, 7, 1)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Spike Predictor Chart
        const spikeCtx = document.getElementById('spikeChart');
        if (spikeCtx) {
            this.charts.spike = new Chart(spikeCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{
                        label: 'Expected Applications',
                        data: [120, 95, 110, 180],
                        backgroundColor: [
                            'rgba(13, 110, 253, 0.8)',
                            'rgba(25, 135, 84, 0.8)',
                            'rgba(255, 193, 7, 0.8)',
                            'rgba(220, 53, 69, 0.8)'
                        ],
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    updateCharts(data) {
        // Update trends chart
        if (this.charts.trends && data.trends_data) {
            this.charts.trends.data.labels = data.trends_data.map(t => t.month);
            this.charts.trends.data.datasets[0].data = data.trends_data.map(t => t.submitted);
            this.charts.trends.data.datasets[1].data = data.trends_data.map(t => t.approved);
            this.charts.trends.update();
        }

        // Update programs chart
        if (this.charts.programs && data.programs_data) {
            this.charts.programs.data.labels = data.programs_data.map(p => p.name);
            this.charts.programs.data.datasets[0].data = data.programs_data.map(p => p.count);
            this.charts.programs.update();
        }

        // Update seasonal chart
        if (this.charts.seasonal && data.seasonal_data) {
            this.charts.seasonal.data.datasets[0].data = data.seasonal_data;
            this.charts.seasonal.update();
        }

        // Update forecast chart
        if (this.charts.forecast && data.forecast_data) {
            this.charts.forecast.data.labels = data.forecast_data.labels;
            this.charts.forecast.data.datasets[0].data = data.forecast_data.historical;
            this.charts.forecast.data.datasets[1].data = data.forecast_data.predicted;
            this.charts.forecast.update();
        }
    }

    async exportReport() {
        try {
            const fromDate = document.getElementById('from-date').value;
            const toDate = document.getElementById('to-date').value;
            
            const response = await adminAuth.makeAuthenticatedRequest(
                `../api/admin/export-analytics.php?from_date=${fromDate}&to_date=${toDate}`
            );
            
            if (!response) return;

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AICS_Analytics_Report_${fromDate}_to_${toDate}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Report exported successfully');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Failed to export report');
        }
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminAnalytics();
});