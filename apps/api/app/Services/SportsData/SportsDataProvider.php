<?php

namespace App\Services\SportsData;

interface SportsDataProvider
{
    /**
     * @return list<SportsFixtureDto>
     */
    public function fetchFixtures(?string $apiKey, array $options): array;
}
