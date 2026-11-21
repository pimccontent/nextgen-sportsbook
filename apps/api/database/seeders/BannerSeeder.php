<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::query()->where('slug', 'default')->first()
            ?? Tenant::query()->create([
                'slug' => 'default',
                'name' => 'NextGen Demo',
                'status' => 'active',
            ]);

        $base = rtrim((string) config('app.url'), '/');

        $slides = [
            [
                'public_id' => 'bn-kickoff',
                'title' => 'The beautiful game',
                'subtitle' => 'Stadium nights, packed stands, and football from everywhere.',
                'image' => 'hero-kickoff.jpg',
                'sort_order' => 0,
            ],
            [
                'public_id' => 'bn-accas',
                'title' => 'Feel the crowd',
                'subtitle' => 'Bet with the energy of fans across the world.',
                'image' => 'hero-accas.jpg',
                'sort_order' => 1,
            ],
            [
                'public_id' => 'bn-live',
                'title' => 'Every duel counts',
                'subtitle' => 'Follow footballers in action with live updates.',
                'image' => 'hero-live.jpg',
                'sort_order' => 2,
            ],
        ];

        foreach ($slides as $slide) {
            Banner::query()->updateOrCreate(
                ['public_id' => $slide['public_id']],
                [
                    'tenant_id' => $tenant->id,
                    'title' => $slide['title'],
                    'subtitle' => $slide['subtitle'],
                    'image_url' => $base.'/banners/'.$slide['image'],
                    'cta_label' => null,
                    'cta_url' => null,
                    'sort_order' => $slide['sort_order'],
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                ]
            );
        }
    }
}
