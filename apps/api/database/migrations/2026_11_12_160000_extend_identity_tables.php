<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable()->unique()->after('name');
            $table->string('role', 32)->default('customer')->index()->after('password');
            $table->string('status', 32)->default('active')->index()->after('role');
            $table->boolean('two_factor_enabled')->default(false)->after('status');
            $table->text('two_factor_secret')->nullable()->after('two_factor_enabled');
            $table->timestamp('last_login_at')->nullable()->after('two_factor_secret');
        });

        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('display_name')->nullable();
            $table->string('country_code', 2)->default('GH');
            $table->string('preferred_currency', 3)->default('GHS');
            $table->json('preferences')->nullable();
            $table->timestamps();
        });

        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('referral_code', 32)->unique();
            $table->foreignId('parent_agent_id')->nullable()->constrained('agents')->nullOnDelete();
            $table->string('status', 32)->default('active');
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64)->index();
            $table->string('subject_type', 64)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('agents');
        Schema::dropIfExists('profiles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'role',
                'status',
                'two_factor_enabled',
                'two_factor_secret',
                'last_login_at',
            ]);
        });
    }
};
