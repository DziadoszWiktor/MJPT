<?php

class ClientSaveHandler
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

        if (!$data) {
            JsonResponse::error('Nieprawidłowy JSON', ['raw' => $raw]);
        }

        $id   = !empty($data['id']) ? (int)$data['id'] : 0;
        $firstName = trim($data['first_name'] ?? '');
        $lastName  = trim($data['last_name'] ?? '');
        $email     = trim($data['email'] ?? '');
        $phone     = trim($data['phone'] ?? '');
        $serviceType  = $data['service_type'] ?? 'MENSILE';
        $servicePrice = (float)($data['service_price'] ?? 0);
        $programStartDate      = $data['program_start_date'] ?? null;
        $programDurationWeeks  = (int)($data['program_duration_weeks'] ?? 0);
        $notes     = $data['notes'] ?? '';
        $isActive  = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        if ($firstName === '' || $lastName === '' || $email === '') {
            JsonResponse::error('Imię, nazwisko i email są wymagane.');
        }

        $nextPayment = null;
        if ($programStartDate) {
            try {
                $startObj = new DateTimeImmutable($programStartDate);
                $interval = ($serviceType === 'TRIMESTRALE') ? '+3 months' : '+1 month';
                $nextPayment = $startObj->modify($interval)->format('Y-m-d');
            } catch (Exception $e) {
                $nextPayment = null;
            }
        }

        if ($id > 0) {
            $stmt = $this->pdo->prepare("
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

            $stmt->execute([
                ':first_name' => $firstName,
                ':last_name'  => $lastName,
                ':email'      => $email,
                ':phone'      => $phone,
                ':service_type' => $serviceType,
                ':service_price' => $servicePrice,
                ':program_start_date' => $programStartDate ?: null,
                ':program_duration_weeks' => $programDurationWeeks,
                ':notes'      => $notes,
                ':is_active'  => $isActive,
                ':id'         => $id,
            ]);

            JsonResponse::success(['status' => 'updated']);

        } else {
            $stmt = $this->pdo->prepare("
                INSERT INTO clients
                    (first_name, last_name, email, phone,
                     service_type, service_price,
                     program_start_date, program_duration_weeks,
                     notes, is_active, next_payment_due_date)
                VALUES
                    (:first_name, :last_name, :email, :phone,
                     :service_type, :service_price,
                     :program_start_date, :program_duration_weeks,
                     :notes, :is_active, :next_payment_due_date)
            ");

            $stmt->execute([
                ':first_name' => $firstName,
                ':last_name'  => $lastName,
                ':email'      => $email,
                ':phone'      => $phone,
                ':service_type' => $serviceType,
                ':service_price' => $servicePrice,
                ':program_start_date' => $programStartDate ?: null,
                ':program_duration_weeks' => $programDurationWeeks,
                ':notes'      => $notes,
                ':is_active'  => $isActive,
                ':next_payment_due_date' => $nextPayment,
            ]);

            JsonResponse::success([
                'status' => 'created',
                'id'     => $this->pdo->lastInsertId(),
            ]);
        }
    }
}
