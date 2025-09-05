<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'aics_system');

class Database {
    private $host = DB_HOST;
    private $user = DB_USER;
    private $password = DB_PASS;
    private $database = DB_NAME;
    private $connection;

    public function __construct() {
        $this->connect();
    }

    private function connect() {
        try {
            $this->connection = new mysqli($this->host, $this->user, $this->password, $this->database);
            
            if ($this->connection->connect_error) {
                throw new Exception("Connection failed: " . $this->connection->connect_error);
            }
            
            $this->connection->set_charset("utf8mb4");
        } catch (Exception $e) {
            $this->handleError("Database connection failed", $e->getMessage());
        }
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $this->connection->error);
            }

            if (!empty($params)) {
                $types = str_repeat('s', count($params));
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            
            if ($stmt->error) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            return $stmt;
        } catch (Exception $e) {
            $this->handleError("Query execution failed", $e->getMessage());
        }
    }

    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        $result = $stmt->get_result();
        $data = [];
        
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data;
    }

    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function getLastInsertId() {
        return $this->connection->insert_id;
    }

    private function handleError($message, $details = '') {
        error_log("Database Error: $message - $details");
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $message
        ]);
        exit;
    }

    public function __destruct() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

// Utility functions
function generateReferenceNumber() {
    $year = date('Y');
    $sequence = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
    return "AICS-{$year}-{$sequence}";
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function sendResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}

// Error handling
set_error_handler(function($severity, $message, $file, $line) {
    error_log("PHP Error: $message in $file on line $line");
    
    if (!(error_reporting() & $severity)) {
        return;
    }
    
    http_response_code(500);
    sendResponse(false, null, 'Internal server error occurred');
});
?>