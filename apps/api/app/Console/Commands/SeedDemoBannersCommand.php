<?php

namespace App\Console\Commands;

use App\Models\Banner;
use App\Models\Tenant;
use Illuminate\Console\Command;

final class SeedDemoBannersCommand extends Command
{
    protected $signature = 'banners:seed-demo';

    protected $description = 'Seed demo hero banners for the customer lobby';

    public function handle(): int
    {
        $tenant = Tenant::default();
        $slides = [
            [
                'public_id' => 'bn-demo-1',
                'title' => 'Weekend Football Special',
                'subtitle' => 'Boosted odds on top leagues',
                'image_url' => 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
                'cta_label' => 'Bet now',
                'cta_url' => '/',
                'sort_order' => 0,
            ],
            [
                'public_id' => 'bn-demo-2',
                'title' => 'Top up & play',
                'subtitle' => 'Grab your sandbox deposit bonus',
                'image_url' => 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1600&q=80',
                'cta_label' => 'Deposit',
                'cta_url' => '/wallet/deposit',
                'sort_order' => 1,
            ],
        ];

        foreach ($slides as $slide) {
            Banner::query()->updateOrCreate(
                ['public_id' => $slide['public_id']],
                array_merge($slide, [
                    'tenant_id' => $tenant->id,
                    'is_active' => true,
                ])
            );
        }

        $this->info('Demo banners ready ('.Banner::query()->count().')');

        return self::SUCCESS;
    }
}
