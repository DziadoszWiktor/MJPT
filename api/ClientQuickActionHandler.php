<?php

class ClientQuickActionHandler
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function handle(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        $id   = isset($data['id']) ? (int)$data['id'] : 0;
        $type = $data['type'] ?? '';

        if ($id <= 0 || $type === '') {
            JsonResponse::error('Brak ID lub typu akcji');
        }

        if ($type === 'toggle_active') {
            $stmt = $this->pdo->prepare(
                "UPDATE clients SET is_active = IF(is_active=1, 0, 1) WHERE id = :id"
            );
            $stmt->execute([':id' => $id]);
        }

        if ($type === 'mark_payment_done') {
            // Ustaw dzisiejszą datę i kolejną płatność +1m / +3m wg typu
            $stmt = $this->pdo->prepare("SELECT service_type FROM clients WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();

            $today = date('Y-m-d');
            $next  = $today;

            if ($row && $row['service_type'] === 'TRIMESTRALE') {
                $next = date('Y-m-d', strtotime('+3 months'));
            } else {
                $next = date('Y-m-d', strtotime('+1 month'));
            }

            $update = $this->pdo->prepare("
                UPDATE clients
                   SET last_payment_date = :today,
                       next_payment_due_date = :next
                 WHERE id = :id
            ");

            $update->execute([
                ':today' => $today,
                ':next'  => $next,
                ':id'    => $id,
            ]);
        }

        if ($type === 'toggle_check_required') {
            $stmt = $this->pdo->prepare(
                "UPDATE clients SET check_required = IF(check_required=1, 0, 1) WHERE id = :id"
            );
            $stmt->execute([':id' => $id]);
        }

        JsonResponse::success(['status' => 'ok']);
    }
}
