<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commission_entries', function (Blueprint $table) {
            $table->foreignId('agent_payout_id')->nullable()->after('payment_intent_id')
                ->constrained('agent_payouts')->nullOnDelete();
            $table->index(['agent_id', 'agent_payout_id']);
        });
    }

    public function down(): void
    {
        Schema::table('commission_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('agent_payout_id');
        });
    }
};
