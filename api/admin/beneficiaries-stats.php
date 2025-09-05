<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    // Get beneficiaries statistics
    $readyForRelease = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Ready for release'")['count'];
    $releasedToday = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Released' AND DATE(updated_at) = CURDATE()")['count'];
    $releasedThisWeek = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Released' AND YEARWEEK(updated_at) = YEARWEEK(NOW())")['count'];
    $releasedThisMonth = $db->fetchOne("SELECT COUNT(*) as count FROM applications WHERE status = 'Released' AND YEAR(updated_at) = YEAR(NOW()) AND MONTH(updated_at) = MONTH(NOW())")['count'];

    sendResponse(true, [
        'ready_for_release' => $readyForRelease,
        'released_today' => $releasedToday,
        'released_this_week' => $releasedThisWeek,
        'released_this_month' => $releasedThisMonth
    ]);

} catch (Exception $e) {
    error_log("Beneficiaries Stats API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load beneficiaries statistics');
}
?>