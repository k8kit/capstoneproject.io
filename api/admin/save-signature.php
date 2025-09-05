<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    checkAdminAuth(['approver', 'citymayor']);
    
    $input = json_decode(file_get_contents('php://input'), true);
    $applicationId = $input['application_id'] ?? '';
    $signatureData = $input['signature_data'] ?? '';

    if (empty($applicationId) || empty($signatureData)) {
        sendResponse(false, null, 'Application ID and signature data are required');
    }

    $db = new Database();
    $currentUser = getCurrentUser();

    // Save signature
    $db->query("
        INSERT INTO e_signatures (application_id, user_id, signature_data) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        signature_data = VALUES(signature_data),
        signed_at = NOW()
    ", [$applicationId, $currentUser['id'], $signatureData]);

    // Log activity
    logActivity(
        $currentUser['id'],
        'signature_added',
        'Digital signature added to application',
        $applicationId
    );

    sendResponse(true, null, 'Signature saved successfully');

} catch (Exception $e) {
    error_log("Save Signature API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to save signature');
}
?>