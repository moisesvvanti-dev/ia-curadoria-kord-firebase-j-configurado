<?php
/**
 * ============================================================
 * PAYPAL IPN WEBHOOK HANDLER - Verificação Automática
 * ============================================================
 * 
 * Este arquivo processa notificações instantâneas do PayPal (IPN)
 * para verificar pagamentos automaticamente e atualizar o ranking
 * de apoiadores verificados.
 * 
 * Segurança:
 * - Verificação IPN com PayPal
 * - Validação de email do recebedor
 * - Proteção contra replay attacks
 * - Log de todas as transações
 */

error_reporting(0);
header('Content-Type: text/plain');

// Configurações
define('PAYPAL_SANDBOX', false); // Mudar para false em produção
define('PAYPAL_EMAIL', 'moisesvvanti@gmail.com');
define('FIREBASE_URL', 'https://sunshinecursos-5f92a-default-rtdb.firebaseio.com');
define('LOG_FILE', __DIR__ . '/paypal_ipn_log.txt');

/**
 * Log de transações para auditoria
 */
function logIPN($message, $level = 'INFO')
{
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message\n";
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Verifica a autenticidade do IPN com PayPal
 */
function verifyIPNWithPayPal($rawData)
{
    $paypalUrl = PAYPAL_SANDBOX
        ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
        : 'https://ipnpb.paypal.com/cgi-bin/webscr';

    $verifyData = 'cmd=_notify-validate&' . $rawData;

    $ch = curl_init($paypalUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $verifyData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Connection: Close'],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        logIPN("PayPal verification HTTP error: $httpCode", 'ERROR');
        return false;
    }

    return trim($response) === 'VERIFIED';
}

/**
 * Sanitiza string para uso como chave Firebase
 */
function sanitizeFirebaseKey($key)
{
    return preg_replace('/[.#$[\]\/]/', '_', $key);
}

/**
 * Salva dados no Firebase
 */
function firebasePut($path, $data)
{
    $url = FIREBASE_URL . "$path.json";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);
    $result = curl_exec($ch);
    curl_close($ch);
    return json_decode($result, true);
}

/**
 * Busca dados do Firebase
 */
function firebaseGet($path)
{
    $url = FIREBASE_URL . "$path.json";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    $result = curl_exec($ch);
    curl_close($ch);
    return json_decode($result, true);
}

/**
 * Atualiza rank do apoiador
 */
function updateSupporterRank($email, $name, $amount, $txnId)
{
    $safeKey = sanitizeFirebaseKey($email);

    // Busca dados existentes
    $existing = firebaseGet("/supporters/$safeKey");

    $totalAmount = ($existing['total_amount'] ?? 0) + $amount;
    $donationCount = ($existing['donation_count'] ?? 0) + 1;

    // Calcula tier baseado no total
    $tier = 'bronze';
    if ($totalAmount >= 100)
        $tier = 'diamond';
    elseif ($totalAmount >= 50)
        $tier = 'gold';
    elseif ($totalAmount >= 25)
        $tier = 'silver';

    $supporterData = [
        'email' => $email,
        'name' => $name,
        'display_name' => $name ?: explode('@', $email)[0],
        'total_amount' => $totalAmount,
        'donation_count' => $donationCount,
        'tier' => $tier,
        'last_donation' => time(),
        'last_txn_id' => $txnId,
        'verified' => true,
        'first_donation' => $existing['first_donation'] ?? time()
    ];

    firebasePut("/supporters/$safeKey", $supporterData);

    logIPN("Supporter updated: $email, Total: R\$$totalAmount, Tier: $tier");

    return $supporterData;
}

/**
 * Registra transação verificada
 */
function recordVerifiedTransaction($data)
{
    $txnId = sanitizeFirebaseKey($data['txn_id']);

    $transaction = [
        'txn_id' => $data['txn_id'],
        'payer_email' => $data['payer_email'],
        'payer_name' => trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
        'amount' => floatval($data['mc_gross']),
        'currency' => $data['mc_currency'] ?? 'BRL',
        'payment_status' => $data['payment_status'],
        'payment_date' => $data['payment_date'] ?? date('Y-m-d H:i:s'),
        'verified' => true,
        'received_at' => time(),
        'item_name' => $data['item_name'] ?? 'Donation'
    ];

    firebasePut("/verified_donations/$txnId", $transaction);

    return $transaction;
}

// ============================================================
// PROCESSAMENTO PRINCIPAL
// ============================================================

// Recebe dados do POST
$rawPostData = file_get_contents('php://input');

if (empty($rawPostData)) {
    logIPN("Empty POST data received", 'WARNING');
    http_response_code(400);
    exit('No data');
}

// Parse dos dados
parse_str($rawPostData, $ipnData);

logIPN("IPN Received: " . json_encode($ipnData));

// Verifica com PayPal se é autêntico
if (!verifyIPNWithPayPal($rawPostData)) {
    logIPN("IPN Verification FAILED", 'ERROR');
    http_response_code(400);
    exit('Invalid IPN');
}

logIPN("IPN Verified successfully");

// Verifica se o email do recebedor é o correto
$receiverEmail = $ipnData['receiver_email'] ?? '';
if (strtolower($receiverEmail) !== strtolower(PAYPAL_EMAIL)) {
    logIPN("Wrong receiver email: $receiverEmail (expected: " . PAYPAL_EMAIL . ")", 'ERROR');
    http_response_code(400);
    exit('Wrong receiver');
}

// Verifica status do pagamento
$paymentStatus = $ipnData['payment_status'] ?? '';
$txnId = $ipnData['txn_id'] ?? '';

// Verifica se já processamos esta transação (proteção replay)
$existingTxn = firebaseGet("/verified_donations/" . sanitizeFirebaseKey($txnId));
if ($existingTxn) {
    logIPN("Duplicate transaction ignored: $txnId", 'WARNING');
    exit('Duplicate');
}

// Processa apenas pagamentos completos
if ($paymentStatus === 'Completed') {
    $payerEmail = $ipnData['payer_email'] ?? '';
    $payerName = trim(($ipnData['first_name'] ?? '') . ' ' . ($ipnData['last_name'] ?? ''));
    $amount = floatval($ipnData['mc_gross'] ?? 0);

    if ($amount > 0 && !empty($payerEmail)) {
        // Registra transação verificada
        recordVerifiedTransaction($ipnData);

        // Atualiza ranking do apoiador
        updateSupporterRank($payerEmail, $payerName, $amount, $txnId);

        logIPN("Payment processed: $payerEmail donated R\$$amount (TXN: $txnId)", 'SUCCESS');
    }
} else {
    logIPN("Payment status not Completed: $paymentStatus", 'INFO');
}

// Responde OK
http_response_code(200);
echo 'OK';
