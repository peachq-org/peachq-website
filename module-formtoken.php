<?php
declare(strict_types=1);

final class FormToken {
    // Published deliberately. This token only proves a form was rendered by the
    // server between MIN_AGE and MAX_AGE ago; it is a bot speed bump, not a
    // secret. The honeypot, the text-quality heuristics and the per-IP rate
    // limit in email.php are what actually hold the line. Rotated 2026-07-20,
    // retiring the value that was committed to the old private repo.
    private const SECRET = 'peachq-56ae0e708f2d25054c08cfe4d8b8aa761fe9';
    private const MIN_AGE = 2;
    private const MAX_AGE = 86400;

    public static function make(): string {
        $ts = time();
        return $ts . '.' . hash_hmac('sha256', (string) $ts, self::SECRET);
    }

    public static function check($token): bool {
        if (!is_string($token) || strpos($token, '.') === false) {
            return false;
        }
        [$ts, $sig] = explode('.', $token, 2);
        if (!ctype_digit($ts)) {
            return false;
        }
        $expected = hash_hmac('sha256', $ts, self::SECRET);
        if (!hash_equals($expected, $sig)) {
            return false;
        }
        $age = time() - (int) $ts;
        return $age >= self::MIN_AGE && $age <= self::MAX_AGE;
    }
}
