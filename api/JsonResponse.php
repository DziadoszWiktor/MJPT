<?php

class JsonResponse
{
    public static function send(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);

        exit;
    }

    public static function success(array $data = [], int $statusCode = 200): void
    {
        self::send($data, $statusCode);
    }

    public static function error(string $message, array $extra = [], int $statusCode = 400): void
    {
        $payload = array_merge(['error' => $message], $extra);
        
        self::send($payload, $statusCode);
    }
}
