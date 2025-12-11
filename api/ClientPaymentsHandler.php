<?php

class ClientPaymentsHandler
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function handle(): void
    {
        $clientId = 0;

        if (isset($_GET['client_id'])) {
            $clientId = (int) $_GET['client_id'];
        } elseif (isset($_GET['id'])) {
            $clientId = (int) $_GET['id'];
        }

        if ($clientId <= 0) {
            JsonResponse::error('ID del cliente non valido.', [], 400);
        }

        try {
            $sql = "
                SELECT 
                    id,
                    client_id,
                    payment_date,
                    amount,
                    created_at
                FROM client_payments
                WHERE client_id = :client_id
                ORDER BY payment_date DESC, id DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':client_id', $clientId, PDO::PARAM_INT);
            $stmt->execute();

            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            JsonResponse::success([
                'client_id' => $clientId,
                'payments'  => $payments,
            ]);
        } catch (PDOException $e) {
            JsonResponse::error('Errore durante il recupero dei pagamenti del cliente.', [], 500);
        }
    }
}