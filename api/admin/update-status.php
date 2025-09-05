<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    checkAdminAuth(['admin', 'approver', 'citymayor']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $applicationId = $input['application_id'] ?? '';
    $status = $input['status'] ?? '';
    $action = $input['action'] ?? '';

    if (empty($applicationId) || empty($status)) {
        sendResponse(false, null, 'Application ID and status are required');
    }

    $db = new Database();
    $currentUser = getCurrentUser();

    // Validate status transitions based on role
    $allowedTransitions = [
        'admin' => [
            'Pending for approval' => ['approved', 'rejected']
        ],
        'approver' => [
            'Approved' => ['waiting', 'rejected']
        ],
        'citymayor' => [
            'Waiting for approval of heads/city mayor' => ['ready', 'rejected']
        ]
    ];

    // Get current application status
    $currentApp = $db->fetchOne("SELECT status FROM applications WHERE id = ?", [$applicationId]);
    if (!$currentApp) {
        sendResponse(false, null, 'Application not found');
    }

    // Map status values
    $statusMap = [
        'approved' => 'Approved',
        'rejected' => 'Rejected',
        'waiting' => 'Waiting for approval of heads/city mayor',
        'ready' => 'Ready for release'
    ];

    $newStatus = $statusMap[$status] ?? $status;

    // Validate transition
    $userRole = $currentUser['role'];
    $currentStatus = $currentApp['status'];
    
    if (!isset($allowedTransitions[$userRole][$currentStatus]) || 
        !in_array($status, $allowedTransitions[$userRole][$currentStatus])) {
        sendResponse(false, null, 'Invalid status transition for your role');
    }

    // Update application status
    $db->query("
        UPDATE applications 
        SET status = ?, updated_at = NOW() 
        WHERE id = ?
    ", [$newStatus, $applicationId]);

    // Log activity
    $actionDescriptions = [
        'approved' => 'Application forwarded to interview',
        'rejected' => 'Application rejected',
        'waiting' => 'Application forwarded to city mayor',
        'ready' => 'Application approved for release'
    ];

    $description = $actionDescriptions[$status] ?? "Status updated to $newStatus";
    
    logActivity(
        $currentUser['id'],
        'status_update',
        $description,
        $applicationId
    );

    sendResponse(true, null, 'Application status updated successfully');

} catch (Exception $e) {
    error_log("Update Status API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to update application status');
}
?>