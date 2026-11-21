<?php

namespace App\Services\SportsData;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Shared TheSportsDB HTTP helper with spacing-friendly retries for free-tier 429s.
 */
final class TheSportsDbClient
{
    /** When true, skips sleep/usleep (set by unit tests). */
    public static bool $skipThrottle = false;

    /**
     * @return list<array<string, mixed>>|null  null on hard failure / rate limit exhaustion
     */
    public function fetchNextLeagueEvents(string $apiKey, string $leagueId, string $leagueCode = ''): ?array
    {
        $attempts = 0;
        $maxAttempts = 2;

        while ($attempts < $maxAttempts) {
            $attempts++;
            try {
                $response = Http::timeout(25)->get(
                    "https://www.thesportsdb.com/api/v1/json/{$apiKey}/eventsnextleague.php",
                    ['id' => $leagueId]
                );

                if ($response->status() === 429) {
                    $wait = $this->retryAfterSeconds($response->header('Retry-After'), $attempts);
                    Log::warning('thesportsdb rate limited', [
                        'league' => $leagueCode ?: $leagueId,
                        'attempt' => $attempts,
                        'wait_seconds' => $wait,
                    ]);
                    if ($attempts >= $maxAttempts) {
                        return null;
                    }
                    $this->pause($wait);
                    continue;
                }

                if (! $response->successful()) {
                    Log::warning('thesportsdb HTTP failure', [
                        'league' => $leagueCode ?: $leagueId,
                        'status' => $response->status(),
                    ]);

                    return null;
                }

                $events = $response->json('events') ?? [];

                return is_array($events) ? $events : [];
            } catch (\Throwable $e) {
                Log::warning('thesportsdb request exception', [
                    'league' => $leagueCode ?: $leagueId,
                    'error' => $e->getMessage(),
                    'attempt' => $attempts,
                ]);
                if ($attempts >= $maxAttempts) {
                    return null;
                }
                $this->pause(min(2 * $attempts, 8));
            }
        }

        return null;
    }

    public static function pauseBetweenLeagues(): void
    {
        if (self::$skipThrottle) {
            return;
        }
        usleep(1_250_000);
    }

    private function retryAfterSeconds(?string $retryAfter, int $attempt): int
    {
        if ($retryAfter !== null && $retryAfter !== '' && ctype_digit($retryAfter)) {
            return max(2, min((int) $retryAfter, 20));
        }

        return min(2 * $attempt, 6);
    }

    private function pause(int $seconds): void
    {
        if (self::$skipThrottle) {
            return;
        }
        sleep(max(0, $seconds));
    }
}
