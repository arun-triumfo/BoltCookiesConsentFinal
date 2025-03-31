<div id="consent-banner" class="consent-banner" style="display: none;">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <div class="consent-banner-container">
        <div class="consent-banner-header">
            <h3>{{ $bannerSettings->banner_title }}</h3>
            <button type="button" class="consent-close" id="consent-close">&times;</button>
        </div>
        <div class="consent-banner-body">
            <p>{{ $bannerSettings->banner_description }}</p>
            
            <div class="consent-options">
                @php
                    // Create an array to track seen categories
                    $seenCategories = [];
                @endphp
                @foreach($categories as $category)
                    @if(!in_array($category->key, $seenCategories))
                        @php
                            $seenCategories[] = $category->key;
                        @endphp
                        <div class="consent-option">
                            <div class="form-check">
                                <input class="form-check-input consent-checkbox" 
                                       type="checkbox" 
                                       value="1" 
                                       id="consent-{{ $category->key }}" 
                                       name="consent[{{ $category->key }}]" 
                                       {{ $category->is_required ? 'checked disabled' : '' }}>
                                <label class="form-check-label" for="consent-{{ $category->key }}">
                                    <strong>{{ $category->name }}</strong>
                                    <span class="consent-required-badge {{ $category->is_required ? '' : 'd-none' }}">Required</span>
                                </label>
                            </div>
                            <p class="consent-description">{{ $category->description }}</p>
                        </div>
                    @endif
                @endforeach
            </div>
        </div>
        <div class="consent-banner-footer">
            @if($bannerSettings->show_reject_button)
            <button type="button" class="btn btn-outline-secondary" id="consent-reject-all">{{ $bannerSettings->reject_button_text }}</button>
            @endif
            @if($bannerSettings->show_manage_button)
            <button type="button" class="btn btn-outline-primary" id="consent-customize-settings">{{ $bannerSettings->manage_button_text }}</button>
            @endif
            <button type="button" class="btn btn-primary" id="consent-accept-all">{{ $bannerSettings->accept_button_text }}</button>
            <button type="button" class="btn btn-success" id="consent-save" style="display: none;">{{ $bannerSettings->save_button_text }}</button>
        </div>
    </div>
</div>

<div class="consent-banner-manage" style="display: none;">
    @if($bannerSettings->show_settings_button)
    <button type="button" class="btn btn-outline-primary" id="consent-preference-manage">
        Manage Cookie Preferences
    </button>
    @endif
</div>

<style>
/* Style for the 'Manage Preferences' button */
.consent-banner-manage {
    position: fixed;
    bottom: {{ $bannerSettings->margin }}px;
    right: {{ $bannerSettings->margin }}px;
    z-index: {{ $bannerSettings->z_index - 1 }};
}

#consent-preference-manage {
    font-size: {{ $bannerSettings->font_size }};
    padding: 0.75rem 1.5rem;
    background-color: {{ $bannerSettings->button_style === 'filled' ? $bannerSettings->primary_color : 'transparent' }};
    color: {{ $bannerSettings->button_style === 'filled' ? '#fff' : $bannerSettings->primary_color }};
    border: 2px solid {{ $bannerSettings->primary_color }};
    border-radius: {{ $bannerSettings->border_radius }};
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s, border-color 0.3s, transform 0.2s;
}

#consent-preference-manage:hover {
    background-color: {{ $bannerSettings->button_style === 'filled' ? $bannerSettings->secondary_color : $bannerSettings->primary_color }};
    border-color: {{ $bannerSettings->button_style === 'filled' ? $bannerSettings->secondary_color : $bannerSettings->primary_color }};
    color: #fff;
    transform: translateY(-2px);
}

#consent-preference-manage:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(38, 143, 255, 0.5);
}

.consent-banner {
    position: fixed;
    {{ $bannerSettings->position === 'bottom' ? 'bottom: 0;' : '' }}
    {{ $bannerSettings->position === 'top' ? 'top: 0;' : '' }}
    {{ $bannerSettings->position === 'center' ? 'top: 50%; transform: translateY(-50%);' : '' }}
    left: 0;
    right: 0;
    background-color: {{ $bannerSettings->background_color }};
    color: {{ $bannerSettings->text_color }};
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: {{ $bannerSettings->z_index }};
    font-family: {{ $bannerSettings->font_family }};
    font-size: {{ $bannerSettings->font_size }};
}

.consent-banner-container {
    @if($bannerSettings->layout === 'box')
    max-width: 600px;
    @elseif($bannerSettings->layout === 'popup')
    max-width: 500px;
    @else
    max-width: 1200px;
    @endif
    margin: 0 auto;
    padding: {{ $bannerSettings->padding }}px;
}

.consent-banner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid {{ $bannerSettings->text_color }}20;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
}

.consent-banner-header h3 {
    margin: 0;
    font-size: calc({{ $bannerSettings->font_size }} * 1.2);
    color: {{ $bannerSettings->text_color }};
}

.consent-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    color: {{ $bannerSettings->text_color }};
}

.consent-banner-body {
    margin-bottom: 1rem;
    color: {{ $bannerSettings->text_color }};
}

.consent-options {
    display: none;
    margin-top: 1rem;
}

.consent-option {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid {{ $bannerSettings->text_color }}20;
}

.consent-option:last-child {
    border-bottom: none;
}

.consent-description {
    margin-top: 0.25rem;
    font-size: calc({{ $bannerSettings->font_size }} * 0.9);
    color: {{ $bannerSettings->text_color }}CC;
}

.consent-required-badge {
    display: inline-block;
    background-color: {{ $bannerSettings->secondary_color }};
    color: #fff;
    font-size: calc({{ $bannerSettings->font_size }} * 0.75);
    padding: 0.125rem 0.375rem;
    border-radius: {{ $bannerSettings->border_radius }};
    margin-left: 0.5rem;
}

.consent-banner-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.btn {
    font-weight: 400;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
    user-select: none;
    border: 1px solid transparent;
    padding: 0.375rem 0.75rem;
    font-size: {{ $bannerSettings->font_size }};
    line-height: 1.5;
    border-radius: {{ $bannerSettings->border_radius }};
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    cursor: pointer;
}

.btn-outline-secondary {
    color: {{ $bannerSettings->secondary_color }};
    border-color: {{ $bannerSettings->secondary_color }};
}

.btn-outline-secondary:hover {
    color: #fff;
    background-color: {{ $bannerSettings->secondary_color }};
    border-color: {{ $bannerSettings->secondary_color }};
}

.btn-outline-primary {
    color: {{ $bannerSettings->primary_color }};
    border-color: {{ $bannerSettings->primary_color }};
}

.btn-outline-primary:hover {
    color: #fff;
    background-color: {{ $bannerSettings->primary_color }};
    border-color: {{ $bannerSettings->primary_color }};
}

.btn-primary {
    color: #fff;
    background-color: {{ $bannerSettings->primary_color }};
    border-color: {{ $bannerSettings->primary_color }};
}

.btn-primary:hover {
    background-color: {{ $bannerSettings->secondary_color }};
    border-color: {{ $bannerSettings->secondary_color }};
}

.btn-success {
    color: #fff;
    background-color: {{ $bannerSettings->primary_color }};
    border-color: {{ $bannerSettings->primary_color }};
}

.btn-success:hover {
    background-color: {{ $bannerSettings->secondary_color }};
    border-color: {{ $bannerSettings->secondary_color }};
}

.form-check {
    position: relative;
    display: block;
    padding-left: 1.25rem;
}

.form-check-input {
    position: absolute;
    margin-top: 0.3rem;
    margin-left: -1.25rem;
}

.form-check-label {
    margin-bottom: 0;
    color: {{ $bannerSettings->text_color }};
}

@if($bannerSettings->theme === 'dark')
body {
    background-color: #333;
}
.consent-banner {
    background-color: #444;
}
.consent-banner-header {
    border-bottom-color: #666;
}
.consent-option {
    border-bottom-color: #666;
}
@endif

@media (min-width: 768px) {
    .consent-banner-manage {
        bottom: {{ $bannerSettings->margin + 10 }}px;
        right: {{ $bannerSettings->margin + 10 }}px;
    }
    #consent-preference-manage {
        font-size: calc({{ $bannerSettings->font_size }} * 1.1);
    }
}
</style>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const consentBanner = document.getElementById('consent-banner');
        const consentBannerManage = document.querySelector('.consent-banner-manage');
        const consentClose = document.getElementById('consent-close');
        const consentRejectAll = document.getElementById('consent-reject-all');
        const consentCustomize = document.getElementById('consent-customize-settings');
        const consentAcceptAll = document.getElementById('consent-accept-all');
        const consentSave = document.getElementById('consent-save');
        const consentOptions = document.querySelector('.consent-options');
        const consentCheckboxes = document.querySelectorAll('.consent-checkbox');
        const consentManageButton = document.getElementById('consent-preference-manage');

        // Debug logging for button initialization
        console.log('DOM Content Loaded - Initializing elements');
        console.log('Customize button:', {
            element: consentCustomize,
            id: consentCustomize ? consentCustomize.id : 'not found',
            display: consentCustomize ? consentCustomize.style.display : 'N/A',
            exists: !!consentCustomize,
            tagName: consentCustomize ? consentCustomize.tagName : 'N/A'
        });

        // Direct DOM check for button
        const directCheck = document.querySelector('#consent-customize-settings');
        console.log('Direct button check:', {
            found: !!directCheck,
            id: directCheck ? directCheck.id : 'not found',
            tagName: directCheck ? directCheck.tagName : 'N/A'
        });

        // Function to show cookie settings
        function showCookieSettings(event) {
            console.log('showCookieSettings called with event:', event);
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // First, ensure the banner is visible
            if (consentBanner) {
                consentBanner.style.display = 'block';
                console.log('Banner displayed');
            } else {
                console.error('Banner element not found');
            }
            
            // Ensure options are visible
            if (consentOptions) {
                consentOptions.style.display = 'block';
                console.log('Options displayed');
            } else {
                console.error('Options element not found');
            }
            
            // Update button visibility with detailed logging
            console.log('Updating button states');
            
            if (consentSave) {
                consentSave.style.display = 'block';
                console.log('Save button visibility updated to: block');
            }
            if (consentAcceptAll) {
                consentAcceptAll.style.display = 'none';
                console.log('Accept all button visibility updated to: none');
            }
            if (consentRejectAll) {
                consentRejectAll.style.display = 'none';
                console.log('Reject all button visibility updated to: none');
            }
            if (consentCustomize) {
                console.log('Customize button found, updating visibility');
                consentCustomize.style.display = 'none';
                console.log('Customize button visibility updated to: none');
            } else {
                console.error('Customize button not found when trying to update visibility');
            }
            if (consentBannerManage) {
                consentBannerManage.style.display = 'none';
                console.log('Banner manage visibility updated to: none');
            }

            // Load preferences with error handling
            loadPreferences()
                .then(() => {
                    console.log('Preferences loaded successfully in showCookieSettings');
                })
                .catch(error => {
                    console.error('Error loading preferences in showCookieSettings:', error);
                });
        }

        // Customize Settings button with improved error handling
        if (consentCustomize) {
            console.log('Setting up customize button click handler');
            try {
                // First try with addEventListener
                consentCustomize.addEventListener('click', function(e) {
                    console.log('Customize button clicked (addEventListener)');
                    showCookieSettings(e);
                });
                
                // Also set onclick as backup
                consentCustomize.onclick = function(e) {
                    console.log('Customize button clicked (onclick)');
                    showCookieSettings(e);
                };
                
                console.log('Click handlers attached successfully');
            } catch (error) {
                console.error('Error setting up click handlers:', error);
            }
        } else {
            console.error('Customize button not found during event binding');
            // Try to find the button again
            const retryButton = document.querySelector('#consent-customize-settings');
            if (retryButton) {
                console.log('Found button on retry, setting up handler');
                retryButton.addEventListener('click', showCookieSettings);
            }
        }

        // Function to update banner visibility
        function updateBannerVisibility(show) {
            console.log('Updating banner visibility:', show ? 'show' : 'hide');
            
            if (consentBanner) {
                consentBanner.style.display = show ? 'block' : 'none';
            }
            if (consentBannerManage) {
                consentBannerManage.style.display = show ? 'none' : 'block';
            }
            
            // If showing banner, ensure proper button states
            if (show) {
                if (consentOptions && consentOptions.style.display === 'block') {
                    // We're in customize mode
                    if (consentSave) consentSave.style.display = 'block';
                    if (consentAcceptAll) consentAcceptAll.style.display = 'none';
                    if (consentRejectAll) consentRejectAll.style.display = 'none';
                    if (consentCustomize) consentCustomize.style.display = 'none';
                } else {
                    // We're in initial banner mode
                    if (consentSave) consentSave.style.display = 'none';
                    if (consentAcceptAll) consentAcceptAll.style.display = 'block';
                    if (consentRejectAll) consentRejectAll.style.display = 'block';
                    if (consentCustomize) consentCustomize.style.display = 'block';
                }
            }
        }

        // Function to update checkbox states
        function updateCheckboxes(preferences) {
            if (!preferences) return;
            
            console.log('Updating checkboxes with preferences:', preferences);
            
            consentCheckboxes.forEach(checkbox => {
                const key = checkbox.name.match(/\[(.*?)\]/)[1];
                // Check both numbered and named keys
                const value = preferences[key] || preferences[getNamedKey(key)] || false;
                if (!checkbox.disabled) {
                    checkbox.checked = value;
                }
            });
        }

        // Helper function to map numbered keys to named keys
        function getNamedKey(key) {
            const keyMap = {
                '1': 'necessary',
                '2': 'statistics',
                '3': 'marketing',
                '4': 'preferences'
            };
            return keyMap[key] || key;
        }

        // Function to get current consent preferences
        function loadPreferences() {
            return fetch('/consent/preferences')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Loaded preferences:', data); // Debug log
                    if (data.preferences) {
                        // Clean up preferences to use consistent keys
                        const cleanPreferences = {};
                        Object.entries(data.preferences).forEach(([key, value]) => {
                            if (!isNaN(key)) { // If key is a number
                                cleanPreferences[getNamedKey(key)] = value;
                            } else {
                                cleanPreferences[key] = value;
                            }
                        });
                        data.preferences = cleanPreferences;
                    }
                    updateCheckboxes(data.preferences);
                    return data;
                })
                .catch(error => {
                    console.error('Error loading preferences:', error);
                });
        }

        // Manage Cookie Preferences button (floating)
        if (consentManageButton) {
            consentManageButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Manage button clicked'); // Debug log
                showCookieSettings();
                loadPreferences().then(() => {
                    console.log('Preferences loaded and applied');
                });
            });
        }

        // Remove the old first visit check functions
        function hasStoredConsent() {
            return localStorage.getItem('consentSaved') === 'true';
        }

        function markConsentAsStored() {
            localStorage.setItem('consentSaved', 'true');
        }

        // Initialize the banner state
        function initializeBannerState() {
            console.log('Initializing banner state');
            
            // Show banner by default until we confirm consent status
            if (consentBanner) {
                consentBanner.style.display = 'block';
            }
            if (consentBannerManage) {
                consentBannerManage.style.display = 'none';
            }
            
            // Check server preferences
            fetch('/consent/preferences', {
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Initial preferences:', data);
                
                // Check if user has actually given consent
                const hasConsent = data && 
                                 data.consented === true && 
                                 data.preferences && 
                                 Object.keys(data.preferences).length > 0;
                
                if (!hasConsent) {
                    // No consent given, show banner
                    console.log('No consent given, showing banner');
                    if (consentBanner) {
                        consentBanner.style.display = 'block';
                    }
                    if (consentBannerManage) {
                        consentBannerManage.style.display = 'none';
                    }
                    
                    // Show initial buttons
                    if (consentOptions) {
                        consentOptions.style.display = 'none';
                    }
                    if (consentAcceptAll) {
                        consentAcceptAll.style.display = 'block';
                    }
                    if (consentRejectAll) {
                        consentRejectAll.style.display = 'block';
                    }
                    if (consentCustomize) {
                        consentCustomize.style.display = 'block';
                    }
                } else {
                    // User has given consent, show manage button
                    console.log('Consent confirmed, showing manage button');
                    if (consentBanner) {
                        consentBanner.style.display = 'none';
                    }
                    if (consentBannerManage) {
                        consentBannerManage.style.display = 'block';
                    }
                }
            })
            .catch(error => {
                console.error('Error checking preferences:', error);
                // On error, keep the banner visible
                if (consentBanner) {
                    consentBanner.style.display = 'block';
                }
                if (consentBannerManage) {
                    consentBannerManage.style.display = 'none';
                }
            });
        }

        // Initialize banner immediately
        initializeBannerState();
        
        // Function to get CSRF token safely
        function getCsrfToken() {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                return metaTag.content;
            }
            console.error('CSRF token meta tag not found');
            return '';
        }
        
        // Function to save consent
        function saveConsent() {
            const consentData = {};
            
            consentCheckboxes.forEach(checkbox => {
                const key = checkbox.name.match(/\[(.*?)\]/)[1];
                const namedKey = getNamedKey(key);
                consentData[namedKey] = checkbox.checked;
            });

            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                console.error('CSRF token not found, cannot save preferences');
                return;
            }
            
            fetch('/consent/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({ consent: consentData })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.message === 'Consent preferences saved successfully') {
                    console.log('Preferences saved successfully');
                    markConsentAsStored();
                    updateBannerVisibility(false);
                    updateCheckboxes(data.preferences);
                    
                    // Initialize analytics if scripts are provided
                    if (data.analytics && Array.isArray(data.analytics)) {
                        initializeAnalytics(data.analytics);
                    }
                } else {
                    console.error('Unexpected response:', data);
                }
            })
            .catch(error => {
                console.error('Error saving preferences:', error);
            });
        }

        // Close button (temporary hide)
        if (consentClose) {
            consentClose.addEventListener('click', function() {
                updateBannerVisibility(false);
            });
        }
        
        // Accept All button
        if (consentAcceptAll) {
            consentAcceptAll.addEventListener('click', function() {
                consentCheckboxes.forEach(checkbox => {
                    checkbox.checked = true;
                });
                saveConsent();
            });
        }
        
        // Save Preferences button
        if (consentSave) {
            consentSave.addEventListener('click', function() {
                saveConsent();
            });
        }
    });
</script>