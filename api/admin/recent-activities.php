<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin', 'approver', 'citymayor']);
    
    $db = new Database();
    
    $activities = $db->fetchAll("
        SELECT 
            al.action,
            al.description,
            al.created_at,
            au.full_name as user_name
        FROM activity_logs al
        LEFT JOIN admin_users au ON al.user_id = au.id
        ORDER BY al.created_at DESC
        LIMIT 10
    ");

    // Add some default activities if none exist
    if (empty($activities)) {
        $activities = [
            [
                'action' => 'system_start',
                'description' => 'AICS system initialized',
                'created_at' => date('Y-m-d H:i:s'),
                'user_name' => 'System'
            ]
        ];
    }

    sendResponse(true, $activities);

} catch (Exception $e) {
    error_log("Recent Activities API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load recent activities');
}
?>