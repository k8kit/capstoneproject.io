<?php
session_start();
require_once '../config.php';
require_once 'auth-middleware.php';

try {
    checkAdminAuth(['admin']);
    
    $db = new Database();
    
    $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-1 month'));
    $toDate = $_GET['to_date'] ?? date('Y-m-d');
    
    // Descriptive Analytics
    $totalApplications = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications 
        WHERE DATE(created_at) BETWEEN ? AND ?
    ", [$fromDate, $toDate])['count'];
    
    $totalBeneficiaries = $db->fetchOne("
        SELECT COUNT(*) as count 
        FROM applications 
        WHERE status IN ('Ready for release', 'Released') 
        AND DATE(updated_at) BETWEEN ? AND ?
    ", [$fromDate, $toDate])['count'];
    
    $approvalRate = $totalApplications > 0 ? 
        round(($totalBeneficiaries / $totalApplications) * 100, 1) : 0;
    
    $avgProcessingTime = $db->fetchOne("
        SELECT AVG(DATEDIFF(updated_at, created_at)) as avg_days
        FROM applications 
        WHERE status IN ('Ready for release', 'Released')
        AND DATE(updated_at) BETWEEN ? AND ?
    ", [$fromDate, $toDate])['avg_days'] ?? 0;
    
    // Trends Data (last 12 months)
    $trendsData = $db->fetchAll("
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as submitted,
            SUM(CASE WHEN status IN ('Ready for release', 'Released') THEN 1 ELSE 0 END) as approved
        FROM applications 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
    ");
    
    // Programs Data
    $programsData = $db->fetchAll("
        SELECT p.name, COUNT(a.id) as count 
        FROM programs p 
        LEFT JOIN applications a ON p.id = a.service_type 
        WHERE DATE(a.created_at) BETWEEN ? AND ?
        GROUP BY p.id, p.name 
        ORDER BY count DESC
    ", [$fromDate, $toDate]);
    
    // Seasonal Data (monthly averages)
    $seasonalData = $db->fetchAll("
        SELECT 
            MONTH(created_at) as month_num,
            AVG(monthly_count) as avg_count
        FROM (
            SELECT 
                created_at,
                COUNT(*) OVER (PARTITION BY YEAR(created_at), MONTH(created_at)) as monthly_count
            FROM applications
        ) as monthly_stats
        GROUP BY MONTH(created_at)
        ORDER BY month_num
    ");
    
    // Generate forecast data (simple trend projection)
    $forecastLabels = [];
    $historicalData = [];
    $predictedData = [];
    
    for ($i = 5; $i >= 0; $i--) {
        $month = date('Y-m', strtotime("-$i months"));
        $forecastLabels[] = date('M Y', strtotime("-$i months"));
        
        $monthData = $db->fetchOne("
            SELECT COUNT(*) as count 
            FROM applications 
            WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
        ", [$month])['count'];
        
        $historicalData[] = $monthData;
    }
    
    // Simple prediction (average growth)
    $avgGrowth = count($historicalData) > 1 ? 
        ($historicalData[count($historicalData)-1] - $historicalData[0]) / (count($historicalData)-1) : 0;
    
    for ($i = 1; $i <= 3; $i++) {
        $forecastLabels[] = date('M Y', strtotime("+$i months"));
        $predictedValue = max(0, $historicalData[count($historicalData)-1] + ($avgGrowth * $i));
        $predictedData[] = round($predictedValue);
    }
    
    // Fill predicted data array to match labels
    $predictedData = array_merge(array_fill(0, count($historicalData), null), $predictedData);
    
    sendResponse(true, [
        'total_applications' => $totalApplications,
        'total_beneficiaries' => $totalBeneficiaries,
        'approval_rate' => $approvalRate,
        'avg_processing_time' => round($avgProcessingTime, 1),
        'trends_data' => $trendsData,
        'programs_data' => $programsData,
        'seasonal_data' => array_column($seasonalData, 'avg_count'),
        'forecast_data' => [
            'labels' => $forecastLabels,
            'historical' => $historicalData,
            'predicted' => $predictedData
        ],
        'forecast_percentage' => round($avgGrowth > 0 ? ($avgGrowth / max(1, $historicalData[0])) * 100 : 15, 1),
        'spike_period' => 'December-January'
    ]);

} catch (Exception $e) {
    error_log("Analytics API Error: " . $e->getMessage());
    sendResponse(false, null, 'Failed to load analytics data');
}
?>