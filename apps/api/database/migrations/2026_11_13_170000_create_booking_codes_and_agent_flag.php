<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->boolean('can_create_booking_codes')->default(false)->after('status');
        });

        Schema::create('booking_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('code', 16)->unique();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('creator_role', 16); // admin|agent
            $table->json('legs');
            $table->boolean('listed')->default(true);
            $table->string('status', 16)->default('active'); // active|revoked
            $table->timestampTz('expires_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'listed', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_codes');
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn('can_create_booking_codes');
        });
    }
};
