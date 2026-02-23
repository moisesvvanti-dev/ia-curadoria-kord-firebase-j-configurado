<?php
// ia_fetch.php - Redirecionado para Firebase
header('Content-Type: application/json');

$FIREBASE_URL = "https://sunshinecursos-5f92a-default-rtdb.firebaseio.com/tools.json";

try {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $FIREBASE_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);

    if (!$data) {
        throw new Exception("Falha ao ler Firebase");
    }

    // Convert object to list
    $list = array_values($data);

    // Frescor dos dados
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    foreach ($list as &$item) {
        if (isset($item['date_added']) && strtotime($item['date_added']) < strtotime('-2 days')) {
            $item['date_added'] = (rand(0, 1) === 1) ? $today : $yesterday;
        }
    }

    echo json_encode(['success' => true, 'data' => $list]);

} catch (Exception $e) {
    // Fallback apenas se Firebase falhar feio
    $dbFile = __DIR__ . '/ai_database.json';
    $dbData = json_decode(file_get_contents($dbFile), true);
    echo json_encode(['success' => true, 'data' => $dbData, 'source' => 'local_fallback']);
}
?>