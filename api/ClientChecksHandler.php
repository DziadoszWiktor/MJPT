<?php

class ClientChecksHandler
{
    /**
     * @var PDO
     */
    private $pdo;

    /**
     * ClientChecksHandler constructor.
     *
     * @param PDO $pdo
     */
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Main handler method.
     */
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
                    check_date,
                    created_at
                FROM client_checks
                WHERE client_id = :client_id
                ORDER BY check_date DESC, id DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':client_id', $clientId, PDO::PARAM_INT);
            $stmt->execute();

            $checks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            JsonResponse::success([
                'client_id' => $clientId,
                'checks'    => $checks,
            ]);
        } catch (PDOException $e) {
            JsonResponse::error('Errore durante il recupero dei check del cliente.', [], 500);
        }
    }
}
