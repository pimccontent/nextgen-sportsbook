<?php

namespace App\Console\Commands;

use App\Models\SportEvent;
use App\Services\MarketCatalogService;
use Illuminate\Console\Command;

final class BackfillMarketsCommand extends Command
{
    protected $signature = 'markets:backfill';

    protected $description = 'Backfill market types/outcome keys and ensure default extras';

    public function handle(MarketCatalogService $catalog): int
    {
        $events = SportEvent::query()->with('markets.selections')->get();
        foreach ($events as $event) {
            foreach ($event->markets as $market) {
                if (! $market->type) {
                    $market->type = $market->is_main ? '1x2' : 'unknown';
                    $market->visible_to_customer = true;
                    $market->save();
                }
                foreach ($market->selections as $selection) {
                    if (! $selection->outcome_key && $selection->side) {
                        $selection->outcome_key = $selection->side;
                        $selection->save();
                    }
                }
            }
            try {
                $catalog->ensureDefaultExtras($event->fresh('markets'));
            } catch (\Throwable $e) {
                $this->warn($event->public_id.': '.$e->getMessage());
            }
        }

        $this->info('Backfilled '.$events->count().' fixtures');

        return self::SUCCESS;
    }
}
