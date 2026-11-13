<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sports', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name', 120);
            $table->string('status', 32)->default('active')->index();
            $table->timestamps();
        });

        Schema::create('competitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sport_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 64)->unique();
            $table->string('name', 160);
            $table->string('country', 120)->nullable();
            $table->string('season_label', 64)->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->string('provider_competition_id', 64)->nullable()->index();
            $table->timestamps();
        });

        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sport_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 64)->unique();
            $table->string('name', 160);
            $table->string('short_name', 16);
            $table->string('provider_team_id', 64)->nullable()->index();
            $table->timestamps();
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 64)->unique();
            $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('home_team_id')->constrained('teams')->restrictOnDelete();
            $table->foreignId('away_team_id')->constrained('teams')->restrictOnDelete();
            $table->timestampTz('kickoff_at')->index();
            $table->string('timezone', 64)->default('UTC');
            $table->string('status', 32)->default('upcoming')->index();
            $table->unsignedSmallInteger('minute')->nullable();
            $table->unsignedSmallInteger('score_home')->nullable();
            $table->unsignedSmallInteger('score_away')->nullable();
            // Platform publication is independent of provider/event status.
            $table->string('publication_state', 32)->default('draft')->index();
            $table->string('provider_event_id', 64)->nullable()->index();
            $table->string('provider_source', 64)->default('mock');
            $table->timestampTz('provider_ingested_at')->nullable();
            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->timestamps();
            $table->index(['competition_id', 'kickoff_at']);
        });

        Schema::create('markets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('public_id', 64);
            $table->string('name', 120);
            $table->string('status', 32)->default('open')->index();
            $table->boolean('is_main')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['event_id', 'public_id']);
        });

        Schema::create('selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_id')->constrained()->cascadeOnDelete();
            $table->string('public_id', 64);
            $table->string('label', 64);
            $table->string('side', 16)->nullable();
            $table->decimal('decimal_odds', 12, 4);
            $table->string('state', 32)->default('open')->index();
            $table->string('movement', 16)->nullable();
            $table->unsignedInteger('odds_version')->default(1);
            $table->timestamps();
            $table->unique(['market_id', 'public_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('selections');
        Schema::dropIfExists('markets');
        Schema::dropIfExists('events');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('competitions');
        Schema::dropIfExists('sports');
    }
};
