<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BannerSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'banner_title',
        'banner_description',
        'accept_button_text',
        'reject_button_text',
        'manage_button_text',
        'save_button_text',
        'cancel_button_text',
        'banner_background_color',
        'banner_text_color',
        'button_background_color',
        'button_text_color',
        'font_family',
        'font_size',
        'show_reject_button',
        'show_manage_button',
        'show_statistics',
        'show_marketing',
        'show_preferences',
        'button_position',
    ];

    protected $casts = [
        'show_reject_button' => 'boolean',
        'show_manage_button' => 'boolean',
        'show_statistics' => 'boolean',
        'show_marketing' => 'boolean',
        'show_preferences' => 'boolean',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }

    public static function getDefaultSettings()
    {
        return [
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
        ];
    }
}
