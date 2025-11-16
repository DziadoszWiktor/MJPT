<?php

class ClientDeleteHandler
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

        if ($id <= 0) {
            JsonResponse::error('No client ID found');
        }

        $stmt = $this->pdo->prepare("DELETE FROM clients WHERE id = :id");
        $stmt->execute([':id' => $id]);

        JsonResponse::success(['status' => 'deleted']);
    }
}
