<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['id'])) {
                // Get single user
                $user = $db->fetchOne("SELECT * FROM admin_users WHERE id = ?", [$_GET['id']]);
                sendResponse(true, $user);
            } else {
                // Get all users
                $users = $db->fetchAll("SELECT id, username, full_name, role, email, is_active, created_at FROM admin_users ORDER BY created_at DESC");
                sendResponse(true, $users);
            }
            break;
            
        case 'POST':
            // Create new user
            $username = sanitizeInput($_POST['username'] ?? '');
            $password = $_POST['password'] ?? '';
            $role = sanitizeInput($_POST['role'] ?? '');
            $fullName = sanitizeInput($_POST['full_name'] ?? '');
            $email = sanitizeInput($_POST['email'] ?? '');

            if (empty($username) || empty($password) || empty($role) || empty($fullName)) {
                sendResponse(false, null, 'All required fields must be filled');
            }

            // Check if username exists
            $existing = $db->fetchOne("SELECT id FROM admin_users WHERE username = ?", [$username]);
            if ($existing) {
                sendResponse(false, null, 'Username already exists');
            }

            $db->query("
                INSERT INTO admin_users (username, password, role, full_name, email) 
                VALUES (?, ?, ?, ?, ?)
            ", [$username, $password, $role, $fullName, $email]);

            sendResponse(true, null, 'User created successfully');
            break;
            
        case 'PUT':
            // Update user
            parse_str(file_get_contents("php://input"), $putData);
            
            $userId = $putData['user_id'] ?? '';
            $username = sanitizeInput($putData['username'] ?? '');
            $role = sanitizeInput($putData['role'] ?? '');
            $fullName = sanitizeInput($putData['full_name'] ?? '');
            $email = sanitizeInput($putData['email'] ?? '');
            $password = $putData['password'] ?? '';

            if (empty($userId) || empty($username) || empty($role) || empty($fullName)) {
                sendResponse(false, null, 'All required fields must be filled');
            }

            $updateSql = "UPDATE admin_users SET username = ?, role = ?, full_name = ?, email = ?";
            $params = [$username, $role, $fullName, $email];

            if (!empty($password)) {
                $updateSql .= ", password = ?";
                $params[] = $password;
            }

            $updateSql .= " WHERE id = ?";
            $params[] = $userId;

            $db->query($updateSql, $params);
            sendResponse(true, null, 'User updated successfully');
            break;
            
        case 'PATCH':
            // Toggle user status
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $input['user_id'] ?? '';
            
            if (empty($userId)) {
                sendResponse(false, null, 'User ID is required');
            }

            $db->query("UPDATE admin_users SET is_active = NOT is_active WHERE id = ?", [$userId]);
            sendResponse(true, null, 'User status updated successfully');
            break;
            
        case 'DELETE':
            // Delete user
            $userId = $_GET['id'] ?? '';
            
            if (empty($userId)) {
                sendResponse(false, null, 'User ID is required');
            }

            // Prevent deleting admin user
            $user = $db->fetchOne("SELECT username FROM admin_users WHERE id = ?", [$userId]);
            if ($user && $user['username'] === 'admin') {
                sendResponse(false, null, 'Cannot delete admin user');
            }

            $db->query("DELETE FROM admin_users WHERE id = ?", [$userId]);
            sendResponse(true, null, 'User deleted successfully');
            break;
            
        default:
            http_response_code(405);
            sendResponse(false, null, 'Method not allowed');
            break;
    }

} catch (Exception $e) {
    error_log("Users API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to process user request');
}
?>