<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->boolean('is_system')->default(false)->after('sender_role');
            $table->timestamp('read_at')->nullable()->after('body');
        });

        Schema::table('support_conversations', function (Blueprint $table) {
            $table->string('subject', 160)->nullable()->after('status');
            $table->text('last_message_preview')->nullable()->after('last_message_at');
            $table->string('last_message_role', 24)->nullable()->after('last_message_preview');
        });
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->dropColumn(['is_system', 'read_at']);
        });
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->dropColumn(['subject', 'last_message_preview', 'last_message_role']);
        });
    }
};
