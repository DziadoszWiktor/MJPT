<?php

class DatabaseConnection
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getPdo(): PDO
    {
        $host = $this->config['db_host'] ?? 'localhost';
        $port = $this->config['db_port'] ?? 3306;
        $db   = $this->config['db_name'] ?? '';
        $user = $this->config['db_user'] ?? '';
        $pass = $this->config['db_pass'] ?? '';

        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";

        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}
