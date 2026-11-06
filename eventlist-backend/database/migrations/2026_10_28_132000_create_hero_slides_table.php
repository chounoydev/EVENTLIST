<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hero_slides', function (Blueprint $table) {
            $table->id();
            $table->string('eyebrow', 100);
            $table->string('title', 160);
            $table->string('description', 500);
            $table->string('art_text', 80);
            $table->string('symbol', 12)->default('✦');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });

        $now = now();
        DB::table('hero_slides')->insert([
            [
                'eyebrow' => 'YOUR NEXT GOOD DAY STARTS HERE',
                'title' => 'Find your people. | Make a memory.',
                'description' => 'Explore upcoming events and find something worth looking forward to.',
                'art_text' => 'Make | it a | moment.',
                'symbol' => '✦',
                'sort_order' => 0,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'eyebrow' => 'BRING YOUR COMMUNITY TOGETHER',
                'title' => 'Good plans. | Better together.',
                'description' => 'From local celebrations to shared interests, discover a reason to get together.',
                'art_text' => 'Meet | share | repeat.',
                'symbol' => '✳',
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'eyebrow' => 'THERE IS ALWAYS SOMETHING HAPPENING',
                'title' => 'Your next story | starts here.',
                'description' => 'Find fresh announcements and make space for the moments that matter.',
                'art_text' => 'Find | your | next.',
                'symbol' => '✧',
                'sort_order' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('hero_slides');
    }
};
