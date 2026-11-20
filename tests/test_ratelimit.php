<?php
declare(strict_types=1);
require_once __DIR__ . '/../static/module-ratelimit.php';

$failures = 0;
function check(string $label, bool $condition): void {
    global $failures;
    if ($condition) {
        echo "PASS  $label\n";
    } else {
        echo "FAIL  $label\n";
        $failures++;
    }
}

$dir = sys_get_temp_dir() . '/peachq-ratelimit-test-' . getmypid();
mkdir($dir, 0700, true);

// Under the cap, requests are allowed.
check('1st of 3 allowed', RateLimit::allow('1.2.3.4', 3, 3600, $dir) === true);
check('2nd of 3 allowed', RateLimit::allow('1.2.3.4', 3, 3600, $dir) === true);
check('3rd of 3 allowed', RateLimit::allow('1.2.3.4', 3, 3600, $dir) === true);

// The 4th exceeds the cap.
check('4th is blocked', RateLimit::allow('1.2.3.4', 3, 3600, $dir) === false);

// A different key has its own budget.
check('other IP unaffected', RateLimit::allow('5.6.7.8', 3, 3600, $dir) === true);

// Entries outside the window do not count.
check('expired window resets', RateLimit::allow('1.2.3.4', 3, 0, $dir) === true);

// Keys must not be usable for path traversal.
check('traversal key is safe', RateLimit::allow('../../etc/passwd', 3, 3600, $dir) === true);

// Every state file must sit directly in $dir under a hashed name. Checking for
// an escaped path is useless -- /etc/passwd exists either way -- so assert the
// filenames instead.
$names = array_map('basename', glob("$dir/*") ?: []);
check('all state files are hashed names', $names !== [] && count(array_filter(
    $names,
    static fn(string $n): bool => (bool)preg_match('/^[0-9a-f]{64}\.json$/', $n)
)) === count($names));
check('no subdirectories were created', count(array_filter(glob("$dir/*") ?: [], 'is_dir')) === 0);

array_map('unlink', glob("$dir/*") ?: []);
rmdir($dir);

echo $failures === 0 ? "\nAll passed\n" : "\n$failures failed\n";
exit($failures === 0 ? 0 : 1);
