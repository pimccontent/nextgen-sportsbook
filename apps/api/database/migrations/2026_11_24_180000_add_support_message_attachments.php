<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->string('attachment_url', 500)->nullable()->after('body');
            $table->string('attachment_name', 255)->nullable()->after('attachment_url');
            $table->string('attachment_mime', 120)->nullable()->after('attachment_name');
            $table->unsignedInteger('attachment_size')->nullable()->after('attachment_mime');
        });
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->dropColumn([
                'attachment_url',
                'attachment_name',
                'attachment_mime',
                'attachment_size',
            ]);
        });
    }
};
