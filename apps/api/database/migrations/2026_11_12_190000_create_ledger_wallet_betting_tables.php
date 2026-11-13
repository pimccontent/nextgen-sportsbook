<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('currency', 3)->default('GHS');
            $table->bigInteger('available_minor')->default(0);
            $table->bigInteger('pending_minor')->default(0);
            $table->bigInteger('reserved_minor')->default(0);
            $table->unsignedInteger('version')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'currency']);
        });

        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('code', 64);
            $table->string('name', 160);
            $table->string('type', 32); // asset, liability, revenue, expense
            $table->string('currency', 3)->default('GHS');
            $table->timestamps();
            $table->unique(['tenant_id', 'code']);
        });

        Schema::create('ledger_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('idempotency_key', 128);
            $table->string('type', 64);
            $table->string('reference_type', 64)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('currency', 3)->default('GHS');
            $table->text('memo')->nullable();
            $table->timestampTz('posted_at');
            $table->timestamps();
            $table->unique(['tenant_id', 'idempotency_key']);
            $table->index(['reference_type', 'reference_id']);
        });

        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_id')->constrained('ledger_journals')->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('wallet_id')->nullable()->constrained('wallets')->nullOnDelete();
            $table->bigInteger('debit_minor')->default(0);
            $table->bigInteger('credit_minor')->default(0);
            $table->timestamps();
        });

        Schema::create('payment_intents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32)->default('paystack');
            $table->string('direction', 16); // deposit, withdrawal
            $table->string('status', 32)->default('pending');
            $table->bigInteger('amount_minor');
            $table->string('currency', 3)->default('GHS');
            $table->string('idempotency_key', 128);
            $table->string('provider_reference', 128)->nullable()->index();
            $table->string('authorization_url', 512)->nullable();
            $table->json('provider_payload')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        Schema::create('bets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('public_id', 64)->unique();
            $table->string('type', 32); // single, accumulator
            $table->string('status', 32)->default('open');
            $table->bigInteger('stake_minor');
            $table->bigInteger('potential_return_minor');
            $table->decimal('combined_odds', 14, 4);
            $table->string('idempotency_key', 128);
            $table->timestampTz('placed_at');
            $table->timestampTz('settled_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        Schema::create('bet_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bet_id')->constrained('bets')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            $table->foreignId('market_id')->constrained('markets')->restrictOnDelete();
            $table->foreignId('selection_id')->constrained('selections')->restrictOnDelete();
            $table->string('event_public_id', 64);
            $table->string('selection_public_id', 64);
            $table->string('label', 120);
            $table->string('market_name', 120);
            $table->decimal('accepted_odds', 12, 4);
            $table->unsignedInteger('odds_version');
            $table->string('result', 32)->default('pending'); // pending, won, lost, void
            $table->timestamps();
        });

        Schema::create('commission_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->foreignId('bet_id')->nullable()->constrained('bets')->nullOnDelete();
            $table->string('status', 32)->default('pending');
            $table->bigInteger('basis_minor');
            $table->unsignedInteger('rate_bps');
            $table->bigInteger('amount_minor');
            $table->timestampTz('hold_until')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_entries');
        Schema::dropIfExists('bet_selections');
        Schema::dropIfExists('bets');
        Schema::dropIfExists('payment_intents');
        Schema::dropIfExists('ledger_entries');
        Schema::dropIfExists('ledger_journals');
        Schema::dropIfExists('ledger_accounts');
        Schema::dropIfExists('wallets');
    }
};
