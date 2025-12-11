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

        $id = isset($data['id']) ? (int)$data['id'] : 0;
        $type = isset($data['type']) ? $data['type'] : '';

        if ($id <= 0 || $type === '') {
            JsonResponse::error('ID cliente e tipo azione richiesti.');
        }

        $stmt = $this->pdo->prepare("SELECT * FROM clients WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $client = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$client) {
            JsonResponse::error('Cliente non trovato.');
        }

        switch ($type) {
            case 'toggle_active':
                $newActive = $client['is_active'] == 1 ? 0 : 1;
                $update = $this->pdo->prepare("UPDATE clients SET is_active = :val WHERE id = :id");
                $update->execute([':val' => $newActive, ':id' => $id]);
                break;

            case 'mark_payment_done':
                $today = date('Y-m-d');
                $serviceType = $client['service_type'];
                $currentDue = $client['next_payment_due_date'];

                if ($currentDue) {
                    $dueObj = new DateTimeImmutable($currentDue);
                    $interval = ($serviceType === 'TRIMESTRALE') ? '+3 months' : '+1 month';
                    $nextDue = $dueObj->modify($interval)->format('Y-m-d');
                } else {
                    $startObj = new DateTimeImmutable($client['program_start_date'] ?: $today);
                    $interval = ($serviceType === 'TRIMESTRALE') ? '+3 months' : '+1 month';
                    $nextDue = $startObj->modify($interval)->format('Y-m-d');
                }

                $this->pdo->beginTransaction();

                $update = $this->pdo->prepare("
                    UPDATE clients 
                    SET last_payment_date = :today, 
                        next_payment_due_date = :next 
                    WHERE id = :id
                ");
                $update->execute([
                    ':today' => $today,
                    ':next'  => $nextDue,
                    ':id'    => $id
                ]);

                $insertPayment = $this->pdo->prepare("
                    INSERT INTO client_payments (client_id, payment_date, amount)
                    VALUES (:client_id, :payment_date, :amount)
                ");
                $insertPayment->execute([
                    ':client_id'    => $id,
                    ':payment_date' => $today,
                    ':amount'       => $client['service_price']
                ]);

                $this->pdo->commit();
                break;

            case 'toggle_check_required':
                $today = date('Y-m-d');

                $this->pdo->beginTransaction();

                $update = $this->pdo->prepare("
                    UPDATE clients 
                    SET last_check_date = :today, 
                        check_required = 1 
                    WHERE id = :id
                ");
                $update->execute([':today' => $today, ':id' => $id]);

                $insertCheck = $this->pdo->prepare("
                    INSERT INTO client_checks (client_id, check_date)
                    VALUES (:client_id, :check_date)
                ");
                $insertCheck->execute([
                    ':client_id'  => $id,
                    ':check_date' => $today
                ]);

                $this->pdo->commit();
                break;

            default:
                JsonResponse::error('Tipo di azione non valido.');
        }

        JsonResponse::success(['status' => 'updated']);
    }
}