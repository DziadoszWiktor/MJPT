<?php

class ExportHandler
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function handle(): void
    {
        $clients = $this->pdo->query("SELECT * FROM clients ORDER BY id ASC")->fetchAll();
        
        $checks = $this->pdo->query("
            SELECT client_id, check_date, created_at 
            FROM client_checks 
            ORDER BY client_id, check_date DESC
        ")->fetchAll();
        
        $payments = $this->pdo->query("
            SELECT client_id, payment_date, amount, created_at 
            FROM client_payments 
            ORDER BY client_id, payment_date DESC
        ")->fetchAll();

        $checksByClient = [];
        foreach ($checks as $ch) {
            $checksByClient[$ch['client_id']][] = $ch;
        }

        $paymentsByClient = [];
        foreach ($payments as $p) {
            $paymentsByClient[$p['client_id']][] = $p;
        }

        $exportData = [
            'clients' => $clients,
            'checks_by_client' => $checksByClient,
            'payments_by_client' => $paymentsByClient
        ];

        JsonResponse::success($exportData);
    }
}