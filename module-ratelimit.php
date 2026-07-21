<?php
declare(strict_types=1);

/**
 * Per-key sliding-window throttle backed by one small file per key.
 *
 * Deliberately dependency-free: the contact form is the only caller and the
 * traffic volume does not justify APCu or Redis.
 */
final class RateLimit {
    /**
     * Records an attempt for $key and reports whether it is within the cap.
     * Returns false when $max attempts have already occurred in the last
     * $windowSeconds.
     */
    public static function allow(string $key, int $max, int $windowSeconds, string $dir): bool {
        // Hash the key so caller-supplied values can never traverse the path.
        $path = rtrim($dir, '/') . '/' . hash('sha256', $key) . '.json';
        $now = time();

        $handle = fopen($path, 'c+');
        if ($handle === false) {
            // Fail open: a broken cache must not take the contact form down.
            return true;
        }
        flock($handle, LOCK_EX);

        $raw = stream_get_contents($handle);
        $stamps = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        if (!is_array($stamps)) {
            $stamps = [];
        }

        $cutoff = $now - $windowSeconds;
        $stamps = array_values(array_filter(
            $stamps,
            static fn($t): bool => is_int($t) && $t > $cutoff
        ));

        $allowed = count($stamps) < $max;
        if ($allowed) {
            $stamps[] = $now;
        }

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($stamps));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);

        return $allowed;
    }
}
