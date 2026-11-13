<?php

namespace App\Console\Commands;

use App\Services\LiveFixtureLifecycle;
use Illuminate\Console\Command;

final class FixturesTickCommand extends Command
{
    protected $signature = 'fixtures:tick';

    protected $description = 'Advance scheduled/live fixtures and armed match scripts';

    public function handle(LiveFixtureLifecycle $lifecycle): int
    {
        $lifecycle->syncDueEvents(120);
        $this->info('Fixtures tick complete');

        return self::SUCCESS;
    }
}
