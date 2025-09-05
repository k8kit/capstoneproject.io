<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    // Build query with filters
    $whereConditions = ["a.status = 'Approved'"];
    $params = [];
    
    if (!empty($_GET['program'])) {
        $whereConditions[] = "a.service_type = ?";
        $params[] = $_GET['program'];
    }
    
    if (!empty($_GET['date'])) {
        $whereConditions[] = "DATE(a.created_at) = ?";
        $params[] = $_GET['date'];
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    $interviewees = $db->fetchAll("
        SELECT 
            a.id,
            a.reference_no,
            a.client_full_name,
            a.beneficiary_full_name,
            a.status,
            a.created_at,
            p.name as service_name
        FROM applications a
        LEFT JOIN programs p ON a.service_type = p.id
        WHERE $whereClause
        ORDER BY a.created_at DESC
    ", $params);

    sendResponse(true, $interviewees);

} catch (Exception $e) {
    error_log("Interviewees API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load interviewees');
}
?>