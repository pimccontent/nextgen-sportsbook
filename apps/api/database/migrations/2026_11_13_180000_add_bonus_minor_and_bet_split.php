<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->bigInteger('bonus_minor')->default(0)->after('available_minor');
        });

        Schema::table('bets', function (Blueprint $table) {
            $table->bigInteger('stake_cash_minor')->default(0)->after('stake_minor');
            $table->bigInteger('stake_bonus_minor')->default(0)->after('stake_cash_minor');
        });
    }

    public function down(): void
    {
        Schema::table('bets', function (Blueprint $table) {
            $table->dropColumn(['stake_cash_minor', 'stake_bonus_minor']);
        });
        Schema::table('wallets', function (Blueprint $table) {
            $table->dropColumn('bonus_minor');
        });
    }
};
