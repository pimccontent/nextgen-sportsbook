<?php

namespace Tests\Unit;

use App\Services\MarketCatalogService;
use ReflectionClass;
use Tests\TestCase;

class CorrectScoreSettlementTest extends TestCase
{
    public function test_templates_include_correct_score_grid(): void
    {
        $catalog = new MarketCatalogService();
        $tpl = $catalog->templates()['correct_score'];
        $this->assertSame('Correct Score', $tpl['name']);
        $keys = array_column($tpl['selections'], 'outcome_key');
        $this->assertContains('h0_a0', $keys);
        $this->assertContains('h3_a3', $keys);
        $this->assertNotContains('other', $keys);
        $this->assertCount(16, $tpl['selections']); // 4x4 grid, custom scores added separately
    }

    public function test_correct_score_match_helper(): void
    {
        $catalog = new MarketCatalogService();
        $ref = new ReflectionClass($catalog);
        $method = $ref->getMethod('matchCorrectScore');
        $method->setAccessible(true);

        $this->assertSame('won', $method->invoke($catalog, 'h2_a1', 2, 1, 3));
        $this->assertSame('lost', $method->invoke($catalog, 'h1_a0', 2, 1, 3));
        $this->assertSame('won', $method->invoke($catalog, 'other', 4, 1, 3));
        $this->assertSame('lost', $method->invoke($catalog, 'other', 2, 1, 3));
        $this->assertSame('lost', $method->invoke($catalog, 'h2_a1', 5, 0, 3));
    }
}
