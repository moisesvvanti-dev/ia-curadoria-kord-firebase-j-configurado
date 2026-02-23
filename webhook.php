<?php
// webhook.php - Endpoint para receber notificações da CodexPay

header('Content-Type: application/json');

function logWebhook($msg)
{
    file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - " . $msg . "\n", FILE_APPEND);
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

// logWebhook("Received webhook: " . $input);

if (isset($data['status'])) {
    $status = strtoupper($data['status']); // PAID, COMPLETED
    $externalId = $data['external_id'] ?? ($data['reference_id'] ?? null);

    // Na criação do pagamento (codex_api.php), salvamos a transação com 'userid' = Email

    if ($externalId && ($status === 'PAID' || $status === 'COMPLETED')) {

        // 1. Busca a transação para pegar o email do usuario
        $FIREBASE_URL = "https://sunshinecursos-5f92a-default-rtdb.firebaseio.com";
        $txUrl = "$FIREBASE_URL/transactions/$externalId.json";
        $ch = curl_init($txUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $txData = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if ($txData) {
            // Atualiza status da transacao
            $txData['status'] = $status;
            $txData['updated_at'] = time();

            // Salva Transacao
            $ch = curl_init($txUrl);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($txData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_exec($ch);
            curl_close($ch);

            // 2. Atualiza a assinatura do usuário
            $userEmail = $txData['userid'] ?? null; // Aqui esperamos que userid seja o email

            if ($userEmail && strpos($userEmail, '@') !== false) {
                $safeKey = str_replace(['.', '$', '#', '[', ']', '/'], '_', $userEmail);
                $userUrl = "$FIREBASE_URL/users/$safeKey.json";

                // Pega dados atuais do usuario
                $ch = curl_init($userUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $userJson = curl_exec($ch);
                curl_close($ch);

                $userData = json_decode($userJson, true) ?? [];

                $currentExpires = $userData['subscription_expires_at'] ?? 0;
                $now = time();

                // Se ainda valido, adiciona 30 dias ao final. Se não, começa de agora.
                if ($currentExpires > $now) {
                    $newExpires = $currentExpires + (30 * 24 * 60 * 60);
                } else {
                    $newExpires = $now + (30 * 24 * 60 * 60);
                }

                $userData['email'] = $userEmail;
                $userData['subscription_expires_at'] = $newExpires;
                $userData['last_payment_date'] = time();
                $userData['last_tx_id'] = $externalId;

                // Salva User
                $ch = curl_init($userUrl);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($userData));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_exec($ch);
                curl_close($ch);

                logWebhook("Subscription updated for: $userEmail. New Expiry: " . date('Y-m-d', $newExpires));
            }
        }
    }
}

echo json_encode(['status' => 'success']);
?>