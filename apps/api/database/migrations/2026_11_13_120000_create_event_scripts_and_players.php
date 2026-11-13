<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('provider_player_id', 120)->nullable()->index();
            $table->string('name', 160);
            $table->unsignedSmallInteger('shirt_number')->nullable();
            $table->string('status', 32)->default('active');
            $table->timestamps();
            $table->unique(['team_id', 'provider_player_id']);
        });

        Schema::create('event_scripts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->unique()->constrained('events')->cascadeOnDelete();
            $table->string('status', 32)->default('draft'); // draft|armed|running|completed|paused|cancelled
            $table->string('clock_mode', 16)->default('sandbox'); // sandbox|live
            $table->unsignedInteger('half_length_seconds')->default(60);
            $table->unsignedInteger('ht_break_seconds')->default(15);
            $table->string('planned_result_side', 16)->nullable(); // home|draw|away
            $table->unsignedSmallInteger('planned_score_home')->default(0);
            $table->unsignedSmallInteger('planned_score_away')->default(0);
            $table->boolean('auto_settle')->default(true);
            $table->timestampTz('armed_at')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('event_script_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('script_id')->constrained('event_scripts')->cascadeOnDelete();
            $table->unsignedInteger('seq');
            $table->string('type', 32); // period_change|goal|match_end
            $table->string('at_period', 8); // 1H|HT|2H|FT
            $table->unsignedInteger('at_elapsed_seconds')->default(0);
            $table->string('side', 8)->nullable(); // home|away
            $table->foreignId('player_id')->nullable()->constrained('players')->nullOnDelete();
            $table->string('player_name_snapshot', 160)->nullable();
            $table->string('to_period', 8)->nullable();
            $table->timestampTz('applied_at')->nullable();
            $table->timestamps();
            $table->unique(['script_id', 'seq']);
            $table->index(['script_id', 'applied_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_script_events');
        Schema::dropIfExists('event_scripts');
        Schema::dropIfExists('players');
    }
};
