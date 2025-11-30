<?php
session_start();

$validUser = "";
$validPass = "";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Dati mancanti']);
    exit;
}

if ($data['username'] === $validUser && $data['password'] === $validPass) {
    $_SESSION['logged_in'] = true;
    $_SESSION['last_activity'] = time();
    echo json_encode(['status' => 'ok']);
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Credenziali non valide']);
}
