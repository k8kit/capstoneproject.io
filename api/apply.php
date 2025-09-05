
<?php

// ...existing code...

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php'; // sendResponse() should be defined here

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        sendResponse(false, null, 'Method not allowed');
    }

    $db = new Database();

    // Validate required fields
    $requiredFields = [
        'client_first_name', 'client_last_name', 'client_sex', 'client_dob',
        'client_address', 'relationship_to_beneficiary', 'civil_status',
        'beneficiary_first_name', 'beneficiary_last_name', 'beneficiary_sex',
        'beneficiary_dob', 'beneficiary_address', 'beneficiary_civil_status',
        'category', 'email', 'service_type'
    ];

    foreach ($requiredFields as $field) {
        if (empty($_POST[$field])) {
            sendResponse(false, null, "Field '$field' is required");
            exit;
        }
    }

    // Validate email
    if (!validateEmail($_POST['email'])) {
        sendResponse(false, null, 'Invalid email format');
        exit;
    }

    // Generate unique reference number
    do {
        $referenceNumber = generateReferenceNumber();
        $existing = $db->fetchOne("SELECT id FROM applications WHERE reference_no = ?", [$referenceNumber]);
    } while ($existing);

    // Prepare application data
    $applicationData = [
        $referenceNumber,
        sanitizeInput($_POST['client_first_name'] . ' ' . $_POST['client_middle_name'] . ' ' . $_POST['client_last_name']),
        sanitizeInput($_POST['client_sex']),
        $_POST['client_dob'],
        sanitizeInput($_POST['client_address']),
        sanitizeInput($_POST['client_place_of_birth'] ?? ''),
        sanitizeInput($_POST['relationship_to_beneficiary']),
        sanitizeInput($_POST['civil_status']),
        sanitizeInput($_POST['religion'] ?? ''),
        sanitizeInput($_POST['nationality'] ?? 'Filipino'),
        sanitizeInput($_POST['education'] ?? ''),
        sanitizeInput($_POST['occupation'] ?? ''),
        floatval($_POST['monthly_income'] ?? 0),
        sanitizeInput($_POST['philhealth_no'] ?? ''),
        sanitizeInput($_POST['admission_mode'] ?? 'Walk-in'),
        sanitizeInput($_POST['referring_party'] ?? ''),
        sanitizeInput($_POST['beneficiary_first_name'] . ' ' . $_POST['beneficiary_middle_name'] . ' ' . $_POST['beneficiary_last_name']),
        sanitizeInput($_POST['beneficiary_sex']),
        $_POST['beneficiary_dob'],
        sanitizeInput($_POST['beneficiary_address']),
        sanitizeInput($_POST['beneficiary_place_of_birth'] ?? ''),
        sanitizeInput($_POST['beneficiary_civil_status']),
        sanitizeInput($_POST['category']),
        sanitizeInput($_POST['category_id_no'] ?? ''),
        $_POST['email'],
        intval($_POST['service_type']),
        'Pending for approval'
    ];

    // Debug logging (after variables are defined)
    error_log("Reference number: " . $referenceNumber);
    error_log("Application data: " . json_encode($applicationData));
    error_log("Family members: " . $_POST['family_members']);
    error_log("Uploaded files: " . $_POST['uploaded_files']);

    // Insert application
    $sql = "INSERT INTO applications (
        reference_no, client_full_name, client_sex, client_dob, client_address, 
        client_place_of_birth, relationship_to_beneficiary, civil_status, religion, 
        nationality, education, occupation, monthly_income, philhealth_no, 
        admission_mode, referring_party, beneficiary_full_name, beneficiary_sex, 
        beneficiary_dob, beneficiary_address, beneficiary_place_of_birth, 
        beneficiary_civil_status, category, category_id_no, email, service_type, status
    ) VALUES (" . str_repeat('?,', count($applicationData) - 1) . "?)";

    $stmt = $db->query($sql, $applicationData);
    $applicationId = $db->getLastInsertId();

    // Insert family members
    if (isset($_POST['family_members'])) {
        $familyMembers = json_decode($_POST['family_members'], true);
        if ($familyMembers && is_array($familyMembers)) {
            $familySql = "INSERT INTO family_members (application_id, full_name, sex, birthdate, civil_status, relationship, education, occupation, monthly_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            foreach ($familyMembers as $member) {
                if (!empty($member['name'])) {
                    $familyData = [
                        $applicationId,
                        sanitizeInput($member['name']),
                        sanitizeInput($member['sex'] ?? ''),
                        $member['birthdate'] ?? null,
                        sanitizeInput($member['civil_status'] ?? ''),
                        sanitizeInput($member['relationship'] ?? ''),
                        sanitizeInput($member['education'] ?? ''),
                        sanitizeInput($member['occupation'] ?? ''),
                        floatval($member['income'] ?? 0)
                    ];
                    $db->query($familySql, $familyData);
                }
            }
        }
    }

    // Insert uploaded documents
    error_log('Uploaded files POST: ' . $_POST['uploaded_files']);
    if (isset($_POST['uploaded_files'])) {
    $uploadedFiles = json_decode($_POST['uploaded_files'], true);
    error_log('Decoded uploaded files: ' . print_r($uploadedFiles, true));
    if ($uploadedFiles === null && $_POST['uploaded_files'] !== 'null') {
        error_log('Invalid uploaded_files JSON: ' . $_POST['uploaded_files']);
    }
    if ($uploadedFiles && is_array($uploadedFiles)) {
        $documentsSql = "INSERT INTO documents (application_id, file_name, file_path, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?)";
        foreach ($uploadedFiles as $file) {
            if (!isset($file['name'], $file['path'], $file['type'])) {
                error_log('Missing file keys: ' . json_encode($file));
                continue;
            }
            $documentData = [
                $applicationId,
                sanitizeInput($file['name']),
                sanitizeInput($file['path']), // file location
                sanitizeInput($file['type']),
                date('Y-m-d H:i:s') // current timestamp
            ];
            try {
                $db->query($documentsSql, $documentData);
            } catch (Exception $ex) {
                error_log("Failed to insert document: " . $e->getMessage());
            }
        }
    }
}


    sendResponse(true, ['reference_number' => $referenceNumber], 'Application submitted successfully');

} catch (Exception $e) {
    error_log("Apply API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to submit application: ' . $e->getMessage());
}
?>