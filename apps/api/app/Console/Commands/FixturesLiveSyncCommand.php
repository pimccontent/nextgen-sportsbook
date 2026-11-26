<?php

namespace App\Console\Commands;

use App\Services\LiveFixtureSyncService;
use Illuminate\Console\Command;

final class FixturesLiveSyncCommand extends Command
{
    protected $signature = 'fixtures:live-sync {--limit=40 : Max unlocked provider fixtures to poll}';

    protected $description = 'Poll sports providers for live/finished updates on unlocked fixtures';

    public function handle(LiveFixtureSyncService $sync): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $stats = $sync->syncDue($limit);
        $this->info(sprintf(
            'Live sync complete: checked=%d updated=%d skipped=%d failed=%d',
            $stats['checked'],
            $stats['updated'],
            $stats['skipped'],
            $stats['failed'],
        ));

        return self::SUCCESS;
    }
}
