<?php
// discovery_trigger.php
// Gatilho para iniciar o robô de descoberta via Python em segundo plano no Windows
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$scriptPath = __DIR__ . '/ai_manager.py';

if (file_exists($scriptPath)) {
    // Escapar o caminho para o shell do Windows
    $cmd = 'start /B py -3.10 "' . $scriptPath . '" --discovery';

    // pclose(popen(...)) é o truque para rodar em BG real sem esperar o PHP travar
    try {
        pclose(popen($cmd, "r"));
        echo json_encode(["success" => true, "message" => "Discovery robot triggered successfully."]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
} else {
    echo json_encode(["success" => false, "error" => "ai_manager.py not found"]);
}
?>