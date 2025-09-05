<?php
session_start();
require_once 'config.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    $username = sanitizeInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        sendResponse(false, null, 'Username and password are required');
    }

    $db = new Database();
    
    // Check user credentials
    $user = $db->fetchOne("
        SELECT id, username, password, role, full_name, is_active 
        FROM admin_users 
        WHERE username = ? AND is_active = 1
    ", [$username]);

    if (!$user) {
        sendResponse(false, null, 'Invalid username or password');
    }

    // Verify password (in production, use password_verify with hashed passwords)
    if ($password !== $user['password']) {
        sendResponse(false, null, 'Invalid username or password');
    }

    // Create session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['login_time'] = time();

    // Log login activity
    $db->query("
        INSERT INTO activity_logs (user_id, action, description, ip_address) 
        VALUES (?, 'login', 'User logged in', ?)
    ", [$user['id'], $_SERVER['REMOTE_ADDR'] ?? 'unknown']);

    sendResponse(true, [
        'role' => $user['role'],
        'username' => $user['username'],
        'full_name' => $user['full_name']
    ], 'Login successful');

} catch (Exception $e) {
    error_log("Auth API Error: " . $e->getMessage());
    sendResponse(false, null, 'Authentication failed');
}
?>