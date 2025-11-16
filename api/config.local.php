<?php
// config.local.php
// LOKALNA konfiguracja – tego pliku NIE wrzucamy do gita (dodany do .gitignore)

return [
    'db_host'   => '',
    'db_port'   => 3306,
    'db_name'   => '',
    'db_user'   => '',
    'db_pass'   => '',

    // opcjonalnie: w dev = true, na prod można dać false
    'display_errors' => true,
];
