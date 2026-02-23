<?php
// user_status.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$email = $input['email'] ?? '';

if (empty($email)) {
    echo json_encode(['success' => false, 'error' => 'Email required']);
    exit;
}

// Sanitize email for Firebase ID usage (replace dots with commas or remove special chars)
// Firebase keys cannot contain '.', '$', '#', '[', ']', '/'
$safeKey = str_replace(['.', '$', '#', '[', ']', '/'], '_', $email);

$firebaseUrl = "https://sunshinecursos-5f92a-default-rtdb.firebaseio.com/users/$safeKey.json";

$ch = curl_init($firebaseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$userData = json_decode($response, true);

$active = false;
$expiresAt = 0;
$daysLeft = 0;

if ($userData && isset($userData['subscription_expires_at'])) {
    $expiresAt = $userData['subscription_expires_at'];
    $now = time();

    if ($expiresAt > $now) {
        $active = true;
        $diff = $expiresAt - $now;
        $daysLeft = ceil($diff / (60 * 60 * 24));
    }
}

echo json_encode([
    'success' => true,
    'active' => $active,
    'days_left' => $daysLeft,
    'expires_date' => $expiresAt > 0 ? date('d/m/Y', $expiresAt) : null
]);
?>