<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consent_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('domain_id')->constrained()->onDelete('cascade');
            $table->string('cookie_id')->unique();
            $table->json('consent_data');
           // $table->json('categories    ');
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('domain');
            $table->string('device_type'); // desktop, tablet, or mobile
            $table->string('language');
            $table->timestamp('consented_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consent_logs');
    }
}; 