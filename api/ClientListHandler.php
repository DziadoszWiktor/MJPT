<?php

class ClientListHandler
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function handle(): void
    {
        $stmt = $this->pdo->query("SELECT * FROM clients ORDER BY id DESC");
        $clients = $stmt->fetchAll();

        JsonResponse::success(['clients' => $clients]);
    }
}
