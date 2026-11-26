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
        return $this->getJsonList(
            "https://www.thesportsdb.com/api/v1/json/{$apiKey}/eventsnextleague.php",
            ['id' => $leagueId],
            'events',
            $leagueCode ?: $leagueId
        );
    }

    /**
     * Lookup a single event by TheSportsDB idEvent (free tier).
     *
     * @return array<string, mixed>|null  Event row, empty array if missing, null on hard failure
     */
    public function lookupEvent(string $apiKey, string $eventId): ?array
    {
        $events = $this->getJsonList(
            "https://www.thesportsdb.com/api/v1/json/{$apiKey}/lookupevent.php",
            ['id' => $eventId],
            'events',
            'event:'.$eventId
        );

        if ($events === null) {
            return null;
        }

        $first = $events[0] ?? null;

        return is_array($first) ? $first : [];
    }

    /**
     * Premium V2 livescores for a sport (e.g. soccer). Returns null when unavailable / free key.
     *
     * @return list<array<string, mixed>>|null
     */
    public function fetchSoccerLivescores(string $apiKey): ?array
    {
        if ($apiKey === '' || $apiKey === '123') {
            return null;
        }

        $attempts = 0;
        $maxAttempts = 2;

        while ($attempts < $maxAttempts) {
            $attempts++;
            try {
                $response = Http::withHeaders(['X-API-KEY' => $apiKey])
                    ->timeout(25)
                    ->get('https://www.thesportsdb.com/api/v2/json/livescore/soccer');

                if ($response->status() === 429) {
                    $wait = $this->retryAfterSeconds($response->header('Retry-After'), $attempts);
                    Log::warning('thesportsdb v2 livescore rate limited', [
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
                    Log::warning('thesportsdb v2 livescore HTTP failure', [
                        'status' => $response->status(),
                    ]);

                    return null;
                }

                $body = $response->json();
                $rows = $body['livescore'] ?? $body['events'] ?? $body;

                return is_array($rows) ? array_values(array_filter($rows, 'is_array')) : [];
            } catch (\Throwable $e) {
                Log::warning('thesportsdb v2 livescore exception', [
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

    /**
     * @param  array<string, mixed>  $query
     * @return list<array<string, mixed>>|null
     */
    private function getJsonList(string $url, array $query, string $listKey, string $context): ?array
    {
        $attempts = 0;
        $maxAttempts = 2;

        while ($attempts < $maxAttempts) {
            $attempts++;
            try {
                $response = Http::timeout(25)->get($url, $query);

                if ($response->status() === 429) {
                    $wait = $this->retryAfterSeconds($response->header('Retry-After'), $attempts);
                    Log::warning('thesportsdb rate limited', [
                        'context' => $context,
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
                        'context' => $context,
                        'status' => $response->status(),
                    ]);

                    return null;
                }

                $events = $response->json($listKey) ?? [];

                return is_array($events) ? $events : [];
            } catch (\Throwable $e) {
                Log::warning('thesportsdb request exception', [
                    'context' => $context,
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
