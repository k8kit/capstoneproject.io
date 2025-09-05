<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    // Get basic stats
    $totalApplicants = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Pending for approval'")['count'];
    $totalInterviewees = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Approved'")['count'];
    $totalBeneficiaries = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status IN ('Ready for release', 'Released')")['count'];
    $approvedToday = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE DATE(updated_at) = CURDATE() AND status IN ('Approved', 'Ready for release')")['count'];

    // Get programs data for chart
    $programsData = $db->fetchAll("
        SELECT p.name, COUNT(a.id) as count 
        FROM programs p 
        LEFT JOIN applications a ON p.id = a.service_type 
        GROUP BY p.id, p.name 
        ORDER BY count DESC
    ");

    // Get status distribution
    $statusData = $db->fetchAll("
        SELECT status, COUNT(*) as count 
        FROM applications 
        GROUP BY status
    ");

    $statusCounts = [
        'pending' => 0,
        'approved' => 0,
        'rejected' => 0,
        'waiting' => 0,
        'ready' => 0
    ];

    foreach ($statusData as $status) {
        switch ($status['status']) {
            case 'Pending for approval':
                $statusCounts['pending'] = $status['count'];
                break;
            case 'Approved':
                $statusCounts['approved'] = $status['count'];
                break;
            case 'Rejected':
                $statusCounts['rejected'] = $status['count'];
                break;
            case 'Waiting for approval of heads/city mayor':
                $statusCounts['waiting'] = $status['count'];
                break;
            case 'Ready for release':
                $statusCounts['ready'] = $status['count'];
                break;
        }
    }

    // Get monthly approvals for the last 6 months
    $monthlyData = $db->fetchAll("
        SELECT 
            DATE_FORMAT(updated_at, '%Y-%m') as month,
            COUNT(*) as count
        FROM applications 
        WHERE status IN ('Approved', 'Ready for release') 
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
        ORDER BY month ASC
    ");

    sendResponse(true, [
        'total_applicants' => $totalApplicants,
        'total_interviewees' => $totalInterviewees,
        'total_beneficiaries' => $totalBeneficiaries,
        'approved_today' => $approvedToday,
        'programs_data' => $programsData,
        'status_data' => $statusCounts,
        'monthly_data' => $monthlyData
    ]);

} catch (Exception $e) {
    error_log("Dashboard Stats API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load dashboard statistics');
}
?>