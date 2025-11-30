<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 4h session
$sessionTimeout = 60 * 60 * 4;

if (!empty($_SESSION['logged_in']) && !empty($_SESSION['last_activity'])) {
    if (time() - $_SESSION['last_activity'] > $sessionTimeout) {
        session_unset();
        session_destroy();
        header("Location: /login/login.html");
        exit;
    }
    $_SESSION['last_activity'] = time();
}

if (empty($_SESSION['logged_in'])) {
    header("Location: /login/login.html");
    exit;
}
