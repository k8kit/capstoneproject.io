<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once 'config.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    if (!isset($_FILES['file'])) {
        sendResponse(false, null, 'No file uploaded');
    }

    $file = $_FILES['file'];
    
    // Validation
    $maxSize = 10 * 1024 * 1024; // 10MB
    $allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    if ($file['size'] > $maxSize) {
        sendResponse(false, null, 'File size exceeds 10MB limit');
    }
    
    if (!in_array($file['type'], $allowedTypes)) {
        sendResponse(false, null, 'Only PDF, JPG, and PNG files are allowed');
    }
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendResponse(false, null, 'File upload error occurred');
    }

    // Create uploads directory if it doesn't exist
    $uploadsDir = __DIR__ . '/../uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $filepath = $uploadsDir . '/' . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        sendResponse(false, null, 'Failed to save uploaded file');
    }

    sendResponse(true, [
    'path' => 'uploads/' . $filename,
    'filename' => $filename,
    'original_name' => $file['name'],
    'size' => $file['size'],
    'type' => $file['type']
], 'File uploaded successfully');

} catch (Exception $e) {
    error_log("Upload API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to upload file');
}
?>