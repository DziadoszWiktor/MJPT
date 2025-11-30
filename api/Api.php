<?php

session_start();

if (empty($_SESSION['logged_in'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Non autorizzato — effettua il login'
    ]);
    exit;
}

$dir = __DIR__;

require $dir . '/DatabaseConnection.php';
require $dir . '/JsonResponse.php';
require $dir . '/ClientListHandler.php';
require $dir . '/ClientSaveHandler.php';
require $dir . '/ClientDeleteHandler.php';
require $dir . '/ClientQuickActionHandler.php';
require $dir . '/ClientChecksHandler.php';
require $dir . '/ClientCheckDeleteHandler.php';
require $dir . '/FallbackHandler.php';

$config = require $dir . '/config.local.php';

//Preventive buff clear
ob_clean();

// Error setting in base of env
if (!empty($config['display_errors'])) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
}

try {
    $db  = new DatabaseConnection($config);
    $pdo = $db->getPdo();
} catch (PDOException $ex) {
    $extra = [];

    if (!empty($config['display_errors'])) {
        $extra['details'] = $ex->getMessage();
    }

    JsonResponse::error('Errore di connessione con la banca dati', $extra, 500);
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Action router
switch ($action) {
    case 'list_clients':
        (new ClientListHandler($pdo))->handle();
        break;

    case 'save_client':
        (new ClientSaveHandler($pdo))->handle();
        break;

    case 'delete_client':
        (new ClientDeleteHandler($pdo))->handle();
        break;

    case 'quick_action':
        (new ClientQuickActionHandler($pdo))->handle();
        break;

    case 'client_checks':
        (new ClientChecksHandler($pdo))->handle();
        break;

    case 'delete_client_check':
        (new ClientCheckDeleteHandler($pdo))->handle();
        break;
    default:
        (new FallbackHandler())->handle($action);
        break;
}
