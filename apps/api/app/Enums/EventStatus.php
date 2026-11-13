<?php

namespace App\Enums;

enum EventStatus: string
{
    case Upcoming = 'upcoming';
    case Live = 'live';
    case Finished = 'finished';
    case Postponed = 'postponed';
    case Cancelled = 'cancelled';
    case Abandoned = 'abandoned';
}
