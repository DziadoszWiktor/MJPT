<?php

class ClientPaymentDeleteHandler
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function handle(): void
    {
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);

        $paymentId = isset($data['id']) ? (int)$data['id'] : 0;

        if ($paymentId <= 0) {
            JsonResponse::error('ID del pagamento non valido.', [], 400);
        }

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                SELECT client_id
                FROM client_payments
                WHERE id = :id
                FOR UPDATE
            ");
            $stmt->execute([':id' => $paymentId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $this->pdo->rollBack();
                JsonResponse::error('Pagamento non trovato.', [], 404);
            }

            $clientId = (int)$row['client_id'];

            $del = $this->pdo->prepare("DELETE FROM client_payments WHERE id = :id");
            $del->execute([':id' => $paymentId]);

            $stmt2 = $this->pdo->prepare("
                SELECT MAX(payment_date) AS last_payment_date
                FROM client_payments
                WHERE client_id = :client_id
            ");
            $stmt2->execute([':client_id' => $clientId]);
            $row2 = $stmt2->fetch(PDO::FETCH_ASSOC);

            $last = $row2 && $row2['last_payment_date'] ? $row2['last_payment_date'] : null;

            $update = $this->pdo->prepare("
                UPDATE clients
                SET last_payment_date = :last
                WHERE id = :client_id
            ");
            $update->execute([
                ':last'      => $last,
                ':client_id' => $clientId,
            ]);

            $this->pdo->commit();

            JsonResponse::success([
                'status'    => 'ok',
                'client_id' => $clientId,
            ]);
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            JsonResponse::error('Errore durante l\'eliminazione del pagamento.', [], 500);
        }
    }
}