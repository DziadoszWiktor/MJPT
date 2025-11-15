<?php
// API JSON dla PT Manager – BEZ HTML

ob_clean();
header("Content-Type: application/json; charset=utf-8");
error_reporting(E_ALL);
ini_set("display_errors", 1);

// ---- USTAWIENIA BAZY DANYCH ----
$host = '';
$port = 3306;
$db   = '';
$user = '';
$pass = '';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ));
} catch (PDOException $ex) {
    echo json_encode([
        "error"   => "Błąd połączenia z bazą",
        "details" => $ex->getMessage(),
    ]);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

function json_response($data) {
    echo json_encode($data);
    exit;
}

// ---- LISTA KLIENTÓW ----
if ($action === 'list_clients') {
    $stmt = $pdo->query("SELECT * FROM clients ORDER BY id DESC");
    $clients = $stmt->fetchAll();
    json_response(['clients' => $clients]);
}

// ---- ZAPIS (CREATE / UPDATE) ----
if ($action === 'save_client') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        json_response(['error' => 'Nieprawidłowy JSON', 'raw' => $raw]);
    }

    $id   = !empty($data['id']) ? (int)$data['id'] : 0;
    $first_name = trim($data['first_name'] ?? '');
    $last_name  = trim($data['last_name'] ?? '');
    $email      = trim($data['email'] ?? '');
    $phone      = trim($data['phone'] ?? '');
    $service_type = $data['service_type'] ?? 'MENSILE';
    $service_price = (float)($data['service_price'] ?? 0);
    $program_start_date = $data['program_start_date'] ?? null;
    $program_duration_weeks = (int)($data['program_duration_weeks'] ?? 0);
    $notes      = $data['notes'] ?? '';
    $is_active  = isset($data['is_active']) ? (int)$data['is_active'] : 1;

    if ($first_name === '' || $last_name === '' || $email === '') {
        json_response(['error' => 'Imię, nazwisko i email są wymagane.']);
    }

    if ($id > 0) {
        // UPDATE
        $stmt = $pdo->prepare("
            UPDATE clients SET
                first_name = :first_name,
                last_name  = :last_name,
                email      = :email,
                phone      = :phone,
                service_type = :service_type,
                service_price = :service_price,
                program_start_date = :program_start_date,
                program_duration_weeks = :program_duration_weeks,
                notes = :notes,
                is_active = :is_active
            WHERE id = :id
        ");
        $stmt->execute(array(
            ':first_name' => $first_name,
            ':last_name'  => $last_name,
            ':email'      => $email,
            ':phone'      => $phone,
            ':service_type' => $service_type,
            ':service_price' => $service_price,
            ':program_start_date' => $program_start_date ?: null,
            ':program_duration_weeks' => $program_duration_weeks,
            ':notes'      => $notes,
            ':is_active'  => $is_active,
            ':id'         => $id,
        ));

        json_response(['status' => 'updated']);
    } else {
        // INSERT
        $stmt = $pdo->prepare("
            INSERT INTO clients
                (first_name, last_name, email, phone,
                 service_type, service_price,
                 program_start_date, program_duration_weeks,
                 notes, is_active)
            VALUES
                (:first_name, :last_name, :email, :phone,
                 :service_type, :service_price,
                 :program_start_date, :program_duration_weeks,
                 :notes, :is_active)
        ");
        $stmt->execute(array(
            ':first_name' => $first_name,
            ':last_name'  => $last_name,
            ':email'      => $email,
            ':phone'      => $phone,
            ':service_type' => $service_type,
            ':service_price' => $service_price,
            ':program_start_date' => $program_start_date ?: null,
            ':program_duration_weeks' => $program_duration_weeks,
            ':notes'      => $notes,
            ':is_active'  => $is_active,
        ));

        json_response(['status' => 'created', 'id' => $pdo->lastInsertId()]);
    }
}

// ---- DELETE ----
if ($action === 'delete_client') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $id = isset($data['id']) ? (int)$data['id'] : 0;

    if ($id <= 0) {
        json_response(['error' => 'Brak prawidłowego ID']);
    }

    $stmt = $pdo->prepare("DELETE FROM clients WHERE id = :id");
    $stmt->execute([':id' => $id]);

    json_response(['status' => 'deleted']);
}

// ---- QUICK ACTIONS ----
if ($action === 'quick_action') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $id   = isset($data['id']) ? (int)$data['id'] : 0;
    $type = $data['type'] ?? '';

    if ($id <= 0 || $type === '') {
        json_response(['error' => 'Brak ID lub typu akcji']);
    }

    if ($type === 'toggle_active') {
        $pdo->prepare("UPDATE clients SET is_active = IF(is_active=1, 0, 1) WHERE id = :id")
            ->execute([':id' => $id]);
    }

    if ($type === 'mark_payment_done') {
        // Ustaw dzisiejszą datę i kolejną płatność +1m / +3m wg typu
        $stmt = $pdo->prepare("SELECT service_type FROM clients WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        $today = date('Y-m-d');
        $next  = $today;

        if ($row && $row['service_type'] === 'TRIMESTRALE') {
            $next = date('Y-m-d', strtotime('+3 months'));
        } else {
            $next = date('Y-m-d', strtotime('+1 month'));
        }

        $pdo->prepare("
            UPDATE clients
               SET last_payment_date = :today,
                   next_payment_due_date = :next
             WHERE id = :id
        ")->execute([
            ':today' => $today,
            ':next'  => $next,
            ':id'    => $id
        ]);
    }

    if ($type === 'toggle_check_required') {
        $pdo->prepare("UPDATE clients SET check_required = IF(check_required=1, 0, 1) WHERE id = :id")
            ->execute([':id' => $id]);
    }

    json_response(['status' => 'ok']);
}

// ---- FALLBACK ----
json_response(['error' => 'Nieznana akcja', 'action' => $action]);
