<?php

class ClientCheckDeleteHandler
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

        $checkId  = isset($data['id']) ? (int)$data['id'] : 0;

        if ($checkId <= 0) {
            JsonResponse::error('ID del check non valido.', [], 400);
        }

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                SELECT client_id
                FROM client_checks
                WHERE id = :id
                FOR UPDATE
            ");
            $stmt->execute([':id' => $checkId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $this->pdo->rollBack();
                JsonResponse::error('Check non trovato.', [], 404);
            }

            $clientId = (int)$row['client_id'];

            $del = $this->pdo->prepare("DELETE FROM client_checks WHERE id = :id");
            $del->execute([':id' => $checkId]);

            $stmt2 = $this->pdo->prepare("
                SELECT MAX(check_date) AS last_check_date
                FROM client_checks
                WHERE client_id = :client_id
            ");
            $stmt2->execute([':client_id' => $clientId]);
            $row2 = $stmt2->fetch(PDO::FETCH_ASSOC);

            $last = $row2 && $row2['last_check_date'] ? $row2['last_check_date'] : null;

            if ($last !== null) {
                $update = $this->pdo->prepare("
                    UPDATE clients
                    SET last_check_date = :last,
                        check_required = CASE
                            WHEN YEAR(:last) = YEAR(CURDATE())
                             AND MONTH(:last) = MONTH(CURDATE())
                            THEN 1
                            ELSE 0
                        END
                    WHERE id = :client_id
                ");
                $update->execute([
                    ':last'      => $last,
                    ':client_id' => $clientId,
                ]);
            } else {
                $update = $this->pdo->prepare("
                    UPDATE clients
                    SET last_check_date = NULL,
                        check_required = 0
                    WHERE id = :client_id
                ");
                $update->execute([
                    ':client_id' => $clientId,
                ]);
            }

            $this->pdo->commit();

            JsonResponse::success([
                'status'    => 'ok',
                'client_id' => $clientId,
            ]);
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            JsonResponse::error('Errore durante l\'eliminazione del check.', [], 500);
        }
    }
}
