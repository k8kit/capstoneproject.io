<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    $beneficiaries = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.beneficiary_full_name,
            a.status,
            a.updated_at,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE a.status IN ('Ready for release', 'Released')
        ORDER BY a.updated_at DESC
    ");

    sendResponse(true, $beneficiaries);

} catch (Exception $e) {
    error_log("Beneficiaries API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load beneficiaries');
}
?>