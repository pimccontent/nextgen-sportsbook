<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_intents', function (Blueprint $table) {
            $table->boolean('commissionable')->nullable()->after('completed_at');
            $table->timestampTz('commission_decided_at')->nullable()->after('commissionable');
            $table->index(['direction', 'status', 'commissionable']);
        });

        Schema::table('commission_entries', function (Blueprint $table) {
            $table->string('source', 16)->default('bet')->after('agent_id');
            $table->foreignId('payment_intent_id')->nullable()->after('bet_id')
                ->constrained('payment_intents')->nullOnDelete();
        });

        // Unique only when payment_intent_id is set (Postgres allows multiple NULLs).
        Schema::table('commission_entries', function (Blueprint $table) {
            $table->unique('payment_intent_id');
        });

        Schema::table('agents', function (Blueprint $table) {
            $table->string('payout_method', 32)->nullable()->after('status'); // momo|bank
            $table->string('payout_network', 64)->nullable()->after('payout_method');
            $table->string('payout_account', 64)->nullable()->after('payout_network');
            $table->string('payout_account_name', 120)->nullable()->after('payout_account');
        });

        Schema::create('agent_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('public_id', 64)->unique();
            $table->string('status', 32)->default('pending'); // pending|approved|paid|rejected
            $table->bigInteger('amount_minor');
            $table->string('currency', 3)->default('GHS');
            $table->string('idempotency_key', 128);
            $table->string('payout_method', 32)->nullable();
            $table->string('payout_network', 64)->nullable();
            $table->string('payout_account', 64)->nullable();
            $table->string('payout_account_name', 120)->nullable();
            $table->text('admin_note')->nullable();
            $table->timestampTz('processed_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_payouts');
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn(['payout_method', 'payout_network', 'payout_account', 'payout_account_name']);
        });
        Schema::table('commission_entries', function (Blueprint $table) {
            $table->dropUnique(['payment_intent_id']);
            $table->dropConstrainedForeignId('payment_intent_id');
            $table->dropColumn('source');
        });
        Schema::table('payment_intents', function (Blueprint $table) {
            $table->dropIndex(['direction', 'status', 'commissionable']);
            $table->dropColumn(['commissionable', 'commission_decided_at']);
        });
    }
};
