<?php

namespace Tests\Unit;

use App\Enums\EventStatus;
use App\Enums\PublicationState;
use App\Http\Controllers\Api\V1\Admin\FixturesAdminController;
use ReflectionClass;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Guards the bulk publication helper contract without hitting the DB.
 */
class FixturesBulkPublicationTest extends TestCase
{
    public function test_bulk_publication_helper_exists_and_accepts_publication_state(): void
    {
        $ref = new ReflectionClass(FixturesAdminController::class);
        $this->assertTrue($ref->hasMethod('bulkPublish'));
        $this->assertTrue($ref->hasMethod('bulkSuspend'));
        $this->assertTrue($ref->hasMethod('bulkSetPublication'));

        $method = new ReflectionMethod(FixturesAdminController::class, 'bulkSetPublication');
        $params = $method->getParameters();
        $this->assertCount(3, $params);
        $this->assertSame(PublicationState::class, $params[1]->getType()?->getName());
    }

    public function test_publication_and_event_enums_cover_bulk_skip_reasons(): void
    {
        $this->assertSame('published', PublicationState::Published->value);
        $this->assertSame('suspended', PublicationState::Suspended->value);
        $this->assertSame('cancelled', EventStatus::Cancelled->value);
    }
}
