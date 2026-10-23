<?php
declare(strict_types=1);

require_once 'module-formtoken.php';
require_once 'module-ratelimit.php';

function peachq_ret(string $message, string $type = 'warning'): void {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['type' => $type, 'message' => $message]);
    exit;
}

function peachq_val(string $key, string $default = ''): string {
    return trim((string)($_REQUEST[$key] ?? $default));
}

$honeypot = peachq_val('company_url');
if ($honeypot !== '' || !FormToken::check($_REQUEST['formtoken'] ?? '')) {
    peachq_ret('Message Sent!', 'success');
}

// The form relays through Google SMTP, so an unthrottled endpoint risks that
// account's sending quota rather than merely filling an inbox. Five per hour is
// far above any legitimate use.
$rateDir = '/var/tmp/peachq-ratelimit';
if (!is_dir($rateDir)) {
    @mkdir($rateDir, 0700, true);
}
$clientIp = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!RateLimit::allow($clientIp, 5, 3600, $rateDir)) {
    peachq_ret('Too many messages from this address. Please try again later.');
}

$from = peachq_val('email');
$name = peachq_val('name');
$subject = peachq_val('subject');
$body = peachq_val('msgbody');
$template = peachq_val('template', 'contact');

$plainBody = strtolower(preg_replace('/\s+/', ' ', $body));
$pos = stripos($plainBody, 'txt:');
$userText = $pos === false ? $plainBody : trim(substr($plainBody, $pos + 4));
if (strlen($userText) < 30 || substr_count($userText, ' ') < 2 || !preg_match('/[aeiou]/', $userText)) {
    peachq_ret('Message Sent!', 'success');
}

if (strlen($body) < 4) {
    peachq_ret('Message body is too short');
}
if (strlen($subject) < 1) {
    peachq_ret('Please enter a subject.');
}
if (strlen($from) < 1) {
    peachq_ret('Please enter an email address.');
}
if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
    peachq_ret('Invalid Email Address');
}

// Overridable so the path to the shared mailer is not baked into a public repo.
$mailerPath = getenv('PEACHQ_MAILER_PATH')
    ?: dirname(__DIR__, 2) . '/timestored.com/public_html/module-mail.php';
if (!is_readable($mailerPath)) {
    peachq_ret('Mail service is not available.', 'error');
}
require_once $mailerPath;

$safeSubject = 'PeachQ Website: ' . $subject;
$safeBody = implode("\n", [
    'PeachQ website contact',
    'Template: ' . $template,
    'Name: ' . $name,
    'Reply email: ' . $from,
    '',
    $body
]);

$result = MyMail::send('ryan@timestored.com', $safeSubject, $safeBody);
peachq_ret((string)($result['message'] ?? 'Message sent.'), (string)($result['type'] ?? 'success'));
