<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'customer_user_id']);
            $table->index(['tenant_id', 'customer_user_id', 'status'], 'support_conv_customer_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->dropIndex('support_conv_customer_status_idx');
            $table->unique(['tenant_id', 'customer_user_id']);
        });
    }
};
