<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_scripts', function (Blueprint $table) {
            $table->unsignedInteger('first_half_seconds')->nullable()->after('half_length_seconds');
            $table->unsignedInteger('second_half_seconds')->nullable()->after('first_half_seconds');
            $table->unsignedInteger('et_first_seconds')->default(0)->after('ht_break_seconds');
            $table->unsignedInteger('et_second_seconds')->default(0)->after('et_first_seconds');
            $table->unsignedInteger('et_break_seconds')->default(0)->after('et_second_seconds');
            $table->boolean('penalties_enabled')->default(false)->after('et_break_seconds');
            $table->unsignedSmallInteger('planned_ht_score_home')->default(0)->after('planned_result_side');
            $table->unsignedSmallInteger('planned_ht_score_away')->default(0)->after('planned_ht_score_home');
            $table->unsignedSmallInteger('planned_et_score_home')->nullable()->after('planned_score_away');
            $table->unsignedSmallInteger('planned_et_score_away')->nullable()->after('planned_et_score_home');
            $table->string('planned_pen_outcome', 8)->nullable()->after('planned_et_score_away'); // home|away|none
        });

        DB::table('event_scripts')->orderBy('id')->chunkById(100, function ($rows) {
            foreach ($rows as $row) {
                DB::table('event_scripts')->where('id', $row->id)->update([
                    'first_half_seconds' => $row->half_length_seconds,
                    'second_half_seconds' => $row->half_length_seconds,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_scripts', function (Blueprint $table) {
            $table->dropColumn([
                'first_half_seconds',
                'second_half_seconds',
                'et_first_seconds',
                'et_second_seconds',
                'et_break_seconds',
                'penalties_enabled',
                'planned_ht_score_home',
                'planned_ht_score_away',
                'planned_et_score_home',
                'planned_et_score_away',
                'planned_pen_outcome',
            ]);
        });
    }
};
