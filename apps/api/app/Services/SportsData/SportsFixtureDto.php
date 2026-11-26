<?php

namespace App\Services\SportsData;

final class SportsFixtureDto
{
    public function __construct(
        public readonly string $providerEventId,
        public readonly string $competitionCode,
        public readonly string $competitionName,
        public readonly string $country,
        public readonly string $homeName,
        public readonly string $homeShort,
        public readonly string $awayName,
        public readonly string $awayShort,
        public readonly string $kickoffIso,
        public readonly string $status, // upcoming|live|finished
        public readonly ?int $scoreHome = null,
        public readonly ?int $scoreAway = null,
        public readonly bool $isTopLeague = true,
        public readonly ?int $minute = null,
        public readonly ?string $period = null,
    ) {
    }
}
