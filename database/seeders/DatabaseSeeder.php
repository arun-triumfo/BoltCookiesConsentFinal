<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'admin',
            'email' => 'admins@gmail.com',
            'password' => bcrypt('Admin@123'),
            'is_admin' => 1,
        ]);

        $this->call([
            ConsentCategorySeeder::class,
            DomainSeeder::class,
            BannerSettingSeeder::class,
        ]);
    }
}
