<?php

namespace Database\Seeders;

use App\Models\BannerSetting;
use App\Models\Domain;
use Illuminate\Database\Seeder;

class BannerSettingSeeder extends Seeder
{
    public function run()
    {
        // Check if settings already exist
        if (!BannerSetting::exists()) {
            // Get the first domain
            $domain = Domain::first();
            
            if ($domain) {
                // Create new settings with all required fields
                BannerSetting::create([
                    'domain_id' => $domain->id,
                    'banner_title' => 'Cookie Consent',
                    'banner_description' => 'We use cookies to enhance your browsing experience and analyze our traffic.',
                    'accept_button_text' => 'Accept All',
                    'reject_button_text' => 'Reject All',
                    'manage_button_text' => 'Manage Settings',
                    'save_button_text' => 'Save Preferences',
                    'cancel_button_text' => 'Cancel',
                    'banner_background_color' => '#ffffff',
                    'banner_text_color' => '#000000',
                    'button_background_color' => '#4CAF50',
                    'button_text_color' => '#ffffff',
                    'font_family' => 'Arial, sans-serif',
                    'font_size' => '14px',
                    'show_reject_button' => true,
                    'show_manage_button' => true,
                    'show_statistics' => true,
                    'show_marketing' => true,
                    'show_preferences' => true,
                    'button_position' => 'right'
                ]);
            }
        }
    }
} 