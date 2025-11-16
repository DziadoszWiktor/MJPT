<?php

class FallbackHandler
{
    public function handle(string $action): void
    {
        JsonResponse::error('Nieznana akcja', ['action' => $action], 404);
    }
}
