<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->timestampTz('ends_at')->nullable()->after('kickoff_at');
            $table->timestampTz('clock_started_at')->nullable()->after('minute');
            $table->string('period', 16)->nullable()->after('clock_started_at'); // 1H, HT, 2H, ET1, ET2, PEN, FT
            $table->unsignedSmallInteger('extra_time_minute')->nullable()->after('period');
            $table->string('home_name_override', 160)->nullable()->after('away_team_id');
            $table->string('away_name_override', 160)->nullable()->after('home_name_override');
            $table->string('home_short_override', 16)->nullable()->after('away_name_override');
            $table->string('away_short_override', 16)->nullable()->after('home_short_override');
            $table->string('result_side', 16)->nullable()->after('score_away'); // home|draw|away|void
            $table->boolean('admin_locked')->default(false)->after('result_side');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'ends_at',
                'clock_started_at',
                'period',
                'extra_time_minute',
                'home_name_override',
                'away_name_override',
                'home_short_override',
                'away_short_override',
                'result_side',
                'admin_locked',
            ]);
        });
    }
};
