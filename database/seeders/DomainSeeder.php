<?php

namespace Database\Seeders;

use App\Models\Domain;
use App\Models\User;
use Illuminate\Database\Seeder;

class DomainSeeder extends Seeder
{
    public function run()
    {
        // Check if domain already exists
        if (!Domain::exists()) {
            // Create default domain
            $domain = Domain::create([
                'name' => 'Default Domain',
                'description' => 'Default domain for testing',
            ]);

            // Get the admin user
            $admin = User::where('email', 'admins@gmail.com')->first();
            
            if ($admin) {
                // Attach the domain to the admin user
                $admin->domains()->attach($domain->id);
            }
        }
    }
} 