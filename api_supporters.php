<?php
/**
 * API para obter ranking de apoiadores verificados
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=60'); // Cache de 1 minuto

define('FIREBASE_URL', 'https://sunshinecursos-5f92a-default-rtdb.firebaseio.com');

// Busca apoiadores do Firebase
$url = FIREBASE_URL . '/supporters.json?orderBy="total_amount"&limitToLast=50';
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false
]);
$result = curl_exec($ch);
curl_close($ch);

$supporters = json_decode($result, true) ?? [];

// Formata e ordena por valor total (decrescente)
$ranking = [];
foreach ($supporters as $key => $supporter) {
    if (!$supporter['verified'])
        continue;

    $ranking[] = [
        'display_name' => $supporter['display_name'] ?? 'Anônimo',
        'tier' => $supporter['tier'] ?? 'bronze',
        'total_amount' => $supporter['total_amount'] ?? 0,
        'donation_count' => $supporter['donation_count'] ?? 1,
        'last_donation' => $supporter['last_donation'] ?? 0,
        'first_donation' => $supporter['first_donation'] ?? 0
    ];
}

// Ordena por total (maior primeiro)
usort($ranking, function ($a, $b) {
    return $b['total_amount'] <=> $a['total_amount'];
});

// Adiciona posição no ranking
foreach ($ranking as $i => &$supporter) {
    $supporter['rank'] = $i + 1;
}

echo json_encode([
    'success' => true,
    'total_supporters' => count($ranking),
    'last_updated' => time(),
    'ranking' => array_slice($ranking, 0, 20) // Top 20
]);
