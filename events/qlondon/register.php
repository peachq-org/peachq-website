<?php
declare(strict_types=1);
ob_start();

require_once __DIR__ . '/../../module-formtoken.php';
require_once __DIR__ . '/../../module-ratelimit.php';

const QLONDON_TAG = 'qlondon-2027';

function qlondon_ret(string $message, string $type = 'warning'): void {
    ob_end_clean();
    $wantsJson = strpos((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false;
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['type' => $type, 'message' => $message]);
    } elseif ($type === 'success') {
        header('Location: ' . qlondon_page() . '?registered=1#register', true, 303);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><meta charset="utf-8"><title>qLondon 2027</title><p>'
            . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p><p><a href="./#register">Back to the form</a></p>';
    }
    exit;
}

function qlondon_page(): string {
    return rtrim(dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/';
}

function qlondon_val(string $key, int $max): string {
    $value = preg_replace('/[\x00-\x1f\x7f]+/', ' ', (string)($_POST[$key] ?? ''));
    return mb_substr(trim($value), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: ' . qlondon_page(), true, 303);
    exit;
}

if (($_POST['company_url'] ?? '') !== '' || !FormToken::check($_POST['formtoken'] ?? '')) {
    qlondon_ret('Registered.', 'success');
}

$rateDir = '/var/tmp/peachq-ratelimit';
if (!is_dir($rateDir)) {
    @mkdir($rateDir, 0700, true);
}
if (!RateLimit::allow('qlondon:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 5, 3600, $rateDir)) {
    qlondon_ret('Too many registrations from this address. Please try again later.');
}

$name = qlondon_val('name', 90);
$email = qlondon_val('email', 60);
$company = qlondon_val('company', 200);

if ($name === '') {
    qlondon_ret('Please enter your name.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    qlondon_ret('Please enter a valid email address.');
}

// Registrations are stored with timestored.com's other contact records.
$mailerPath = getenv('PEACHQ_MAILER_PATH')
    ?: dirname(__DIR__, 4) . '/timestored.com/public_html/module-mail.php';
$timestored = dirname($mailerPath);
foreach (['module-db.php', 'site.php', 'module-mail.php'] as $module) {
    if (!is_readable("$timestored/$module")) {
        qlondon_ret('Registration is not available right now. Please try again later.', 'error');
    }
}
require_once "$timestored/module-db.php";
require_once "$timestored/site.php";

$stored = false;
try {
    $stored = Site::logContact(new DB(), $email, QLONDON_TAG, 'company=' . $company, $name);
} catch (Throwable $e) {
    $stored = false;
}
if (!$stored) {
    qlondon_ret('Registration failed. Please try again later.', 'error');
}

try {
    require_once "$timestored/module-mail.php";
    MyMail::send('ryan@timestored.com', 'qLondon 2027 interest: ' . $name,
        implode("\n", ['Name: ' . $name, 'Email: ' . $email, 'Company: ' . $company, 'Tag: ' . QLONDON_TAG]));
} catch (Throwable $e) {
}

qlondon_ret('Registered.', 'success');
