<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-1 month'));
    $toDate = $_GET['to_date'] ?? date('Y-m-d');
    
    $db = new Database();
    
    // Get analytics data
    $totalApplications = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications 
        WHERE DATE(created_at) BETWEEN ? AND ?
    ", [$fromDate, $toDate])['count'];
    
    $totalBeneficiaries = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications 
        WHERE status IN ('Ready for release', 'Released') 
        AND DATE(updated_at) BETWEEN ? AND ?
    ", [$fromDate, $toDate])['count'];
    
    $approvalRate = $totalApplications > 0 ? 
        round(($totalBeneficiaries / $totalApplications) * 100, 1) : 0;
    
    // Generate CSV content
    $csvContent = "AICS Analytics Report\n";
    $csvContent .= "Period: $fromDate to $toDate\n\n";
    $csvContent .= "Summary Statistics\n";
    $csvContent .= "Total Applications,$totalApplications\n";
    $csvContent .= "Total Beneficiaries,$totalBeneficiaries\n";
    $csvContent .= "Approval Rate,$approvalRate%\n\n";
    
    // Get detailed data
    $applications = $db->fetchAll("
        SELECT 
            a.reference_no,
            a.client_full_name,
            a.beneficiary_full_name,
            a.status,
            a.created_at,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE DATE(a.created_at) BETWEEN ? AND ?
        ORDER BY a.created_at DESC
    ", [$fromDate, $toDate]);
    
    $csvContent .= "Detailed Applications\n";
    $csvContent .= "Reference Number,Client Name,Beneficiary Name,Service Type,Status,Date Submitted\n";
    
    foreach ($applications as $app) {
        $csvContent .= "\"{$app['reference_no']}\",\"{$app['client_full_name']}\",\"{$app['beneficiary_full_name']}\",\"{$app['service_name']}\",\"{$app['status']}\",\"{$app['created_at']}\"\n";
    }
    
    // Set headers for file download
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="AICS_Analytics_Report_' . $fromDate . '_to_' . $toDate . '.csv"');
    header('Content-Length: ' . strlen($csvContent));
    
    echo $csvContent;
    exit;

} catch (Exception $e) {
    error_log("Export Analytics API Error: " . $e->getMessage());
    http_response_code(500);
    echo "Error generating report";
}
?>