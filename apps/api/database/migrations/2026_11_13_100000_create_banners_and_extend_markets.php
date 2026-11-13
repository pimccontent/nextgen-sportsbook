<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('public_id', 64)->unique();
            $table->string('title', 160);
            $table->string('subtitle', 255)->nullable();
            $table->string('image_url', 500);
            $table->string('cta_label', 80)->nullable();
            $table->string('cta_url', 500)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestampTz('starts_at')->nullable();
            $table->timestampTz('ends_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'is_active', 'sort_order']);
        });

        Schema::table('markets', function (Blueprint $table) {
            $table->string('type', 32)->default('1x2')->after('name');
            $table->json('params')->nullable()->after('type');
            $table->boolean('visible_to_customer')->default(true)->after('status');
        });

        Schema::table('selections', function (Blueprint $table) {
            $table->string('outcome_key', 32)->nullable()->after('side');
        });
    }

    public function down(): void
    {
        Schema::table('selections', function (Blueprint $table) {
            $table->dropColumn('outcome_key');
        });
        Schema::table('markets', function (Blueprint $table) {
            $table->dropColumn(['type', 'params', 'visible_to_customer']);
        });
        Schema::dropIfExists('banners');
    }
};
