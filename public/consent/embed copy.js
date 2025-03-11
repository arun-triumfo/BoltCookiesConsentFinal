(function() {
    // Check if script is already initialized
    if (window.BOLT_CONSENT_INITIALIZED) {
        console.log('BoltConsent already initialized, skipping...');
        return;
    }

    // Store original GTM configuration
    const originalGTMConfig = {
        id: null,
        dataLayer: window.dataLayer || [],
        gtag: window.gtag,
        ga: window.ga,
        google_tag_manager: window.google_tag_manager
    };

    // Find GTM ID from existing script
    const gtmScript = document.querySelector('script[src*="googletagmanager.com/gtm.js"]');
    if (gtmScript) {
        const gtmUrl = new URL(gtmScript.src);
        originalGTMConfig.id = gtmUrl.searchParams.get('id');
        console.log('Found GTM ID:', originalGTMConfig.id);
    }

    // Store GA4 ID if present
    const ga4Script = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    if (ga4Script) {
        const ga4Url = new URL(ga4Script.src);
        originalGTMConfig.ga4id = ga4Url.searchParams.get('id');
        console.log('Found GA4 ID:', originalGTMConfig.ga4id);
    }











    // Default configuration
    const defaultConfig = {
        scriptId: null,
        apiKey: null,
        apiUrl: 'http://cokkiesconsent.local/api'
    };

    // Merge user config with defaults
    const config = {
        ...defaultConfig,
        ...(window.BOLT_CONSENT_CONFIG || {})
    };

    // Validate configuration
    if (!config.scriptId || !config.apiKey) {
        console.error('BoltConsent: Script ID and API Key are required. Please add them to your configuration like this:');
        console.error(`
            <script>
                window.BOLT_CONSENT_CONFIG = {
                    scriptId: 'your-domain-script-id',  // Get this from your BoltConsent dashboard
                    apiKey: 'your-domain-api-key'       // Get this from your BoltConsent dashboard
                };
            </script>
            <script src="/consent/embed.js"></script>
        `);
        return;
    }

    // Detect device type
    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    // Get browser language
    function getBrowserLanguage() {
        return navigator.language || navigator.userLanguage;
    }

    console.log('BoltConsent initialized with config:', config);

    // Define tracking scripts to block
    const trackingScripts = [
        'googletagmanager.com/gtm.js',
        'google-analytics.com',
        'analytics.js',
        'gtag/js',
        'connect.facebook.net',
        'doubleclick.net',
        'googleadservices.com',
        'googlesyndication.com',
        'google-analytics.com/analytics.js',
        'google-analytics.com/ga.js',
        'stats.g.doubleclick.net',
        'google-analytics.com/collect'
    ];

    // Store original functions and descriptors
    const originalFunctions = {
        createElement: document.createElement,
        cookieDesc: Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                   Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie'),
        dataLayerPush: window.dataLayer ? window.dataLayer.push : null
    };

    // Create and inject the banner HTML
    async function createBanner() {
        try {
            // Fetch banner settings from API
            const response = await fetch(`${config.apiUrl}/banner-settings/${window.location.hostname}`);
            const data = await response.json();
            
            if (!data.success) {
                console.error('Failed to fetch banner settings:', data.error);
                return;
            }

            const settings = data.data.settings;
            if (!settings || !settings.style) {
                console.error('Invalid banner settings:', settings);
                return;
            }
            
            // Remove existing elements if they exist
            const existingBanner = document.getElementById('bolt-consent-banner');
            const existingManage = document.getElementById('bolt-consent-manage');
            if (existingBanner) existingBanner.remove();
            if (existingManage) existingManage.remove();

            const banner = document.createElement('div');
            banner.id = 'bolt-consent-banner';
            banner.style.display = checkConsentExists() ? 'none' : 'block'; // Set initial display state
            banner.innerHTML = `
                <div class="bolt-consent-banner" style="
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: ${settings.style.backgroundColor};
                    color: ${settings.style.textColor};
                    padding: 20px;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                    z-index: 9999;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-family: ${settings.style.fontFamily};
                    font-size: ${settings.style.fontSize};
                ">
                    <div style="flex: 1;">
                        <p style="margin: 0;">${settings.description}</p>
                    </div>
                    <div style="margin-left: 20px;">
                        ${settings.show_reject_button ? `
                            <button id="bolt-reject-all" style="
                                background: ${settings.style.secondaryColor};
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                margin-right: 10px;
                            ">${settings.reject_button_text}</button>
                        ` : ''}
                        <button id="bolt-accept-all" style="
                            background: ${settings.style.primaryColor};
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            margin-right: 10px;
                        ">${settings.accept_button_text}</button>
                        ${settings.show_manage_button ? `
                            <button id="bolt-manage-settings" style="
                                background: ${settings.style.secondaryColor};
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                            ">${settings.manage_button_text}</button>
                        ` : ''}
                    </div>
                </div>

                <!-- Settings Modal -->
                <div id="bolt-consent-settings" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 999999;
                    overflow-y: auto;
                    display: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                ">
                    <div style="
                        background: ${settings.style.backgroundColor};
                        color: ${settings.style.textColor};
                        max-width: 600px;
                        width: 90%;
                        margin: 40px auto;
                        padding: 30px;
                        border-radius: 8px;
                        position: relative;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        min-height: 200px;
                        transform: translateY(-20px);
                        transition: transform 0.3s ease;
                        z-index: 1000000;
                        font-family: ${settings.style.fontFamily};
                        font-size: ${settings.style.fontSize};
                    ">
                        <button id="bolt-close-settings" style="
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            padding: 5px;
                            line-height: 1;
                            z-index: 1000001;
                        ">&times;</button>
                        
                        <h2 style="margin-top: 0; margin-right: 30px; position: relative; z-index: 1000001;">${settings.title}</h2>
                        
                        <div class="consent-categories" style="margin-top: 20px; position: relative; z-index: 1000001;">
                            <!-- Categories will be loaded here -->
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                            <button id="bolt-cancel-settings" style="
                                background: ${settings.style.secondaryColor};
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                            ">${settings.cancel_button_text}</button>
                            <button id="bolt-save-settings" style="
                                background: ${settings.style.primaryColor};
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: 500;
                            ">${settings.save_button_text}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(banner);

            // Add event listeners for buttons
            const acceptAllBtn = document.getElementById('bolt-accept-all');
            const rejectAllBtn = document.getElementById('bolt-reject-all');
            const manageSettingsBtn = document.getElementById('bolt-manage-settings');
            const closeSettingsBtn = document.getElementById('bolt-close-settings');
            const cancelSettingsBtn = document.getElementById('bolt-cancel-settings');
            const saveSettingsBtn = document.getElementById('bolt-save-settings');

            if (acceptAllBtn) {
                acceptAllBtn.addEventListener('click', async () => {
                    const consentData = {};
                    const categories = await fetch(`${config.apiUrl}/categories`).then(r => r.json());
                    if (categories.success) {
                        categories.data.forEach(category => {
                            consentData[category.key] = !category.is_required;
                        });
                        await saveConsent(consentData);
                    }
                });
            }

            if (rejectAllBtn) {
                rejectAllBtn.addEventListener('click', async () => {
                    const consentData = {};
                    const categories = await fetch(`${config.apiUrl}/categories`).then(r => r.json());
                    if (categories.success) {
                        categories.data.forEach(category => {
                            consentData[category.key] = category.is_required;
                        });
                        await saveConsent(consentData);
                    }
                });
            }

            if (manageSettingsBtn) {
                manageSettingsBtn.addEventListener('click', showSettingsModal);
            }

            if (closeSettingsBtn) {
                closeSettingsBtn.addEventListener('click', hideSettingsModal);
            }

            if (cancelSettingsBtn) {
                cancelSettingsBtn.addEventListener('click', hideSettingsModal);
            }

            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', async () => {
                    const checkboxes = document.querySelectorAll('.consent-categories input[type="checkbox"]');
                    const consentData = {};
                    checkboxes.forEach(checkbox => {
                        consentData[checkbox.id] = checkbox.checked;
                    });
                    await saveConsent(consentData);
                });
            }

            // Create manage button separately if enabled
            if (settings.show_manage_button) {
                const manageButton = document.createElement('div');
                manageButton.id = 'bolt-consent-manage';
                manageButton.innerHTML = `
                    <button id="bolt-manage-cookies" style="
                        background: ${settings.style.secondaryColor};
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        font-size: 14px;
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        z-index: 9998;
                        font-family: ${settings.style.fontFamily};
                    ">${settings.manage_button_text}</button>
                `;
                document.body.appendChild(manageButton);

                // Add event listener for manage button
                const manageCookiesBtn = document.getElementById('bolt-manage-cookies');
                if (manageCookiesBtn) {
                    manageCookiesBtn.addEventListener('click', showSettingsModal);
                }
            }

        } catch (error) {
            console.error('Error creating banner:', error);
        }
    }

    // Function to show banner
    function showBanner() {
        const banner = document.getElementById('bolt-consent-banner');
        const manageButton = document.getElementById('bolt-consent-manage');
        if (banner) {
            banner.style.display = 'block';
            // Show only the manage settings button in the banner
            const acceptAllBtn = document.getElementById('bolt-accept-all');
            const rejectAllBtn = document.getElementById('bolt-reject-all');
            if (acceptAllBtn) acceptAllBtn.style.display = 'none';
            if (rejectAllBtn) rejectAllBtn.style.display = 'none';
        }
        if (manageButton) {
            manageButton.style.display = 'none';
        }
    }

    // Function to hide banner
    function hideBanner() {
        const banner = document.getElementById('bolt-consent-banner');
        const manageButton = document.getElementById('bolt-consent-manage');
        if (banner) {
            banner.style.display = 'none';
        }
        if (manageButton) {
            manageButton.style.display = 'block';
        }
    }

    // Function to check if consent exists
    function checkConsentExists() {
        // Check localStorage
        const savedConsent = localStorage.getItem('bolt_consent');
        const savedCookieId = localStorage.getItem('bolt_consent_cookie_id');
        
        // Check cookies
        const consentCookie = document.cookie.split('; ').find(row => row.startsWith('bolt_consent='));
        
        return savedConsent && savedCookieId && consentCookie;
    }

    // Function to get saved consent data
    function getSavedConsent() {
        const savedConsent = localStorage.getItem('bolt_consent');
        return savedConsent ? JSON.parse(savedConsent) : null;
    }

    // Function to show settings modal
    function showSettingsModal() {
        const modal = document.getElementById('bolt-consent-settings');
        if (modal) {
            modal.style.display = 'block';
            modal.style.opacity = '1';

            // Show the banner when opening settings
            showBanner();

            // Fetch consent categories from API
            fetch(`${config.apiUrl}/categories`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const categoriesContainer = document.querySelector('.consent-categories');
                        if (categoriesContainer) {
                            categoriesContainer.innerHTML = data.data.map(category => `
                                <div class="consent-category">
                                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                        <input type="checkbox" 
                                               id="${category.key}" 
                                               ${category.is_required ? 'checked disabled' : ''} 
                                               style="margin-right: 10px;">
                                        <label for="${category.key}" style="font-weight: bold;">${category.name}</label>
                                    </div>
                                    <p style="margin: 0 0 20px 0; color: #666;">${category.description}</p>
                                </div>
                            `).join('');

                            // Load saved preferences
                            const savedConsent = getSavedConsent();
                            if (savedConsent) {
                                data.data.forEach(category => {
                                    if (!category.is_required) {
                                        const checkbox = document.getElementById(category.key);
                                        if (checkbox) {
                                            checkbox.checked = savedConsent[category.key] || false;
                                        }
                                    }
                                });
                            }
                        }
                    }
                })
                .catch(error => console.error('Error fetching consent categories:', error));
        }
    }

    // Function to hide settings modal
    function hideSettingsModal() {
        const modal = document.getElementById('bolt-consent-settings');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }








    // Function to check if GTM should be loaded
    function shouldLoadGTM() {
        const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
        // Only load GTM if consent exists and necessary and statistics categories are accepted
        return consentData && consentData.necessary === true && consentData.statistics === true;
    }

    // Function to prevent tracking cookies and scripts
    function preventTracking() {
        try {
            console.log('Setting up tracking prevention...');

            // Remove existing tracking scripts first
            trackingScripts.forEach(scriptPattern => {
                const scripts = document.querySelectorAll(`script[src*="${scriptPattern}"]`);
                scripts.forEach(script => {
                    console.log('Removing existing tracking script:', script.src);
                    script.remove();
                });
            });

            // Block script loading via script tags
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT') {
                            const src = node.src || '';
                            if (trackingScripts.some(script => src.includes(script))) {
                                console.log('Blocked dynamic script loading:', src);
                                node.remove();
                            }
                        }
                    });
                });
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            // Block GTM and GA initialization
            Object.defineProperty(window, 'google_tag_manager', {
                get: function() {
                    return null;
                },
                set: function() {
                    console.log('Blocked GTM initialization attempt');
                    return null;
                },
                configurable: true
            });

            // Block dataLayer
            Object.defineProperty(window, 'dataLayer', {
                get: function() {
                    return {
                        push: function() {
                            console.log('DataLayer push blocked - no consent');
                            return;
                        }
                    };
                },
                set: function() {
                    console.log('Blocked dataLayer modification attempt');
                    return null;
                },
                configurable: true
            });

            // Block gtag
            Object.defineProperty(window, 'gtag', {
                get: function() {
                    return function() {
                        console.log('gtag call blocked - no consent');
                    };
                },
                set: function() {
                    console.log('Blocked gtag initialization attempt');
                    return null;
                },
                configurable: true
            });

            // Block ga
            Object.defineProperty(window, 'ga', {
                get: function() {
                    return function() {
                        console.log('ga call blocked - no consent');
                    };
                },
                set: function() {
                    console.log('Blocked ga initialization attempt');
                    return null;
                },
                configurable: true
            });

            // Override createElement
            document.createElement = function(tagName) {
                const element = originalFunctions.createElement.call(document, tagName);
                if (tagName.toLowerCase() === 'script') {
                    const originalSetAttribute = element.setAttribute;
                    element.setAttribute = function(name, value) {
                        if (name === 'src' && trackingScripts.some(script => value.includes(script))) {
                            console.log('Blocked tracking script:', value);
                            return;
                        }
                        return originalSetAttribute.call(this, name, value);
                    };
                }
                return element;
            };

            // Cookie blocking
            if (originalFunctions.cookieDesc && originalFunctions.cookieDesc.configurable) {
                Object.defineProperty(document, 'cookie', {
                    get: function() {
                        return originalFunctions.cookieDesc.get.call(document);
                    },
                    set: function(val) {
                        const trackingCookies = [
                            '_ga', '_gid', '_gat', '_fbp', '_fbc', '_gcl_au',
                            '_dc_gtm_', '_gat_gtag_', '_gat_UA_', '_gat_',
                            'IDE', 'test_cookie', 'fr', 'tr', 'ads/ga-audiences'
                        ];

                        if (trackingCookies.some(prefix => val.startsWith(prefix))) {
                            console.log('Blocked tracking cookie:', val);
                            return;
                        }
                        originalFunctions.cookieDesc.set.call(document, val);
                    },
                    configurable: true
                });
            }

            console.log('Tracking prevention set up successfully');
        } catch (e) {
            console.error('Error setting up tracking prevention:', e);
        }
    }

    // Function to remove tracking prevention
    function removeTrackingPrevention() {
        try {
            console.log('Removing tracking prevention...');
            
            // Restore original property descriptors
            if (Object.getOwnPropertyDescriptor(window, 'google_tag_manager')) {
                delete window.google_tag_manager;
            }
            if (Object.getOwnPropertyDescriptor(window, 'ga')) {
                delete window.ga;
            }
            if (Object.getOwnPropertyDescriptor(window, 'gtag')) {
                delete window.gtag;
            }
            if (Object.getOwnPropertyDescriptor(window, 'dataLayer')) {
                delete window.dataLayer;
            }

            // Restore original createElement
            if (originalFunctions.createElement) {
                document.createElement = originalFunctions.createElement;
            }

            // Restore original cookie descriptor
            if (originalFunctions.cookieDesc && originalFunctions.cookieDesc.configurable) {
                Object.defineProperty(document, 'cookie', originalFunctions.cookieDesc);
            }

            console.log('Tracking prevention removed successfully');
            return true;
        } catch (error) {
            console.error('Error removing tracking prevention:', error);
            return false;
        }
    }

    // Function to restore tracking functionality
    function restoreTracking() {
        try {
            console.log('Attempting to restore tracking functionality with detailed logging...');
            
            // First, remove tracking prevention
            removeTrackingPrevention();
            
            // Get GTM ID
            const gtmId = originalGTMConfig.id;
            if (!gtmId) {
                console.error('No GTM ID found for restoration');
                return false;
            }

            console.log('Using GTM ID for restoration:', gtmId);
            
            // Remove any existing GTM scripts
            const existingGtmScripts = document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]');
            existingGtmScripts.forEach(script => {
                console.log('Removing existing GTM script:', script.src);
                script.remove();
            });

            // Initialize dataLayer
            window.dataLayer = window.dataLayer || [];
            
            // Create and inject GTM script
            return new Promise((resolve) => {
                const gtmScript = document.createElement('script');
                gtmScript.async = true;
                gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
                
                gtmScript.onload = () => {
                    console.log('GTM script loaded successfully');
                    
                    // Initialize gtag
                    window.gtag = function() {
                        window.dataLayer.push(arguments);
                    };
                    
                    window.gtag('js', new Date());

                    // Initialize GA4 if available
                    if (originalGTMConfig.ga4id) {
                        console.log('Initializing GA4:', originalGTMConfig.ga4id);
                        window.gtag('config', originalGTMConfig.ga4id);
                    }

                    resolve(true);
                };
                
                gtmScript.onerror = (error) => {
                    console.error('Failed to load GTM script:', error);
                    resolve(false);
                };
                
                document.head.appendChild(gtmScript);
                console.log('GTM script injected');
            });
        } catch (error) {
            console.error('Error in restoreTracking:', error);
            return false;
        }
    }

    // Function to set GTM consent state
    function setGTMConsentState(consentData) {
        try {
            console.log('Setting GTM consent state with detailed logging:', consentData);
            
            const consentState = {
                'analytics_storage': consentData.statistics ? 'granted' : 'denied',
                'ad_storage': consentData.marketing ? 'granted' : 'denied',
                'personalization_storage': consentData.preferences ? 'granted' : 'denied',
                'functionality_storage': consentData.preferences ? 'granted' : 'denied',
                'security_storage': 'granted'
            };

            // If statistics is granted, restore tracking functionality
            if (consentData.statistics) {
                console.log('Statistics consent granted, initiating tracking restoration...');
                
                // First push default consent state
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': 'consent_default',
                    'consent_state': consentState
                });
                
                // Then restore tracking
                const restored = restoreTracking();
                console.log('Tracking restoration result:', restored);

                // Wait longer for GTM to initialize
                setTimeout(() => {
                    if (window.dataLayer) {
                        console.log('Pushing final consent state to dataLayer');
                        window.dataLayer.push({
                            'event': 'consent_update',
                            'consent_state': consentState,
                            'consent_categories': Object.entries(consentData)
                                .filter(([key, value]) => value)
                                .map(([key]) => key),
                            'consent_status': Object.values(consentData).every(v => v) ? 'all_accepted' : 'partial'
                        });
                        
                        // Verify dataLayer state
                        console.log('Current dataLayer state:', window.dataLayer);
                    } else {
                        console.error('DataLayer not available after waiting');
                    }
                }, 2000);
            } else {
                console.log('Statistics consent not granted, blocking tracking');
                preventTracking();
            }
        } catch (error) {
            console.error('Error in setGTMConsentState:', error);
        }
    }

    // Function to validate and load GTM
    function validateAndLoadGTM() {
        try {
            const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
            
            if (!shouldLoadGTM()) {
                // Set denied consent state
                setGTMConsentState(consentData);
                
                // Block all tracking scripts and cookies
                preventTracking();
                
                // Push consent rejected event
                if (window.dataLayer) {
                    window.dataLayer.push({
                        'event': 'consent_rejected',
                        'consent_state': 'rejected',
                        'consent_data': consentData
                    });
                }

                return false;
            } else {
                // Set granted consent state and restore tracking
                setGTMConsentState(consentData);
                
                // Push consent granted event
                if (window.dataLayer) {
                    window.dataLayer.push({
                        'event': 'consent_granted',
                        'consent_state': 'granted',
                        'consent_data': consentData
                    });
                }

                return true;
            }
        } catch (error) {
            console.error('Error in validateAndLoadGTM:', error);
            return false;
        }
    }

    // Function to set cookies based on consent
    function setConsentCookies(consentData) {
        try {
            // Set consent data cookie
            document.cookie = `bolt_consent=${JSON.stringify(consentData)};path=/;max-age=31536000;SameSite=Strict`;
            console.log('Consent cookie set:', consentData);
            // Set individual category cookies
            Object.keys(consentData).forEach(category => {
                document.cookie = `bolt_consent_${category}=${consentData[category]};path=/;max-age=31536000;SameSite=Strict`;
            });

            // Set GTM consent cookies
            if (window.dataLayer) {
                window.dataLayer.push({
                    'consent': {
                        'analytics_storage': consentData.statistics ? 'granted' : 'denied',
                        'ad_storage': consentData.marketing ? 'granted' : 'denied',
                        'personalization_storage': consentData.preferences ? 'granted' : 'denied',
                        'functionality_storage': consentData.preferences ? 'granted' : 'denied',
                        'security_storage': 'granted'
                    }
                });
                console.log('GTM consent cookies set:', consentData);
            }
        } catch (error) {
            console.error('Error setting consent cookies:', error);
        }
    }

    // Function to initialize GTM with consent mode
    function initializeGTM() {
        try {
            // Block all tracking by default
            preventTracking();

            // Initialize dataLayer with denied consent mode
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'consent': {
                    'analytics_storage': 'denied',
                    'ad_storage': 'denied',
                    'personalization_storage': 'denied',
                    'functionality_storage': 'denied',
                    'security_storage': 'granted'
                }
            });

            // Check if consent already exists and restore if needed
            const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
            if (shouldLoadGTM()) {
                restoreTracking();
            }
        } catch (error) {
            console.error('Error initializing GTM:', error);
        }
    }

    // Save consent to the server
    async function saveConsent(consentData) {
        try {
            console.log('Saving consent with script ID:', config.scriptId);
            console.log('Consent data:', consentData);

            const response = await fetch(`${config.apiUrl}/consent/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    script_id: config.scriptId,
                    api_key: config.apiKey,
                    consent_data: consentData,
                    domain: window.location.hostname,
                    ip_address: null,
                    user_agent: navigator.userAgent,
                    device_type: getDeviceType(),
                    language: getBrowserLanguage(),
                    categories: Object.entries(consentData)
                        .filter(([key, value]) => value)
                        .map(([key]) => key)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Consent saved successfully:', data);
            
            // Store consent data in localStorage
            localStorage.setItem('bolt_consent', JSON.stringify(consentData));
            if (data.data && data.data.cookie_id) {
                localStorage.setItem('bolt_consent_cookie_id', data.data.cookie_id);
            }

            // Set cookies based on consent
            setConsentCookies(consentData);

            // Handle tracking based on consent
            if (consentData.statistics) {
                console.log('Statistics enabled, initiating immediate GTM restoration...');
                
                // Remove tracking prevention first
                removeTrackingPrevention();
                
                // Initialize dataLayer with consent state
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': 'consent_update',
                    'consent_state': {
                        'analytics_storage': 'granted',
                        'ad_storage': consentData.marketing ? 'granted' : 'denied',
                        'personalization_storage': consentData.preferences ? 'granted' : 'denied',
                        'functionality_storage': consentData.preferences ? 'granted' : 'denied',
                        'security_storage': 'granted'
                    }
                });

                // Immediate GTM restoration
                const restored = await restoreTracking();
                
                if (restored) {
                    console.log('GTM restored successfully');
                    // Push page view event after restoration
                    window.dataLayer.push({
                        'event': 'pageview',
                        'page_path': window.location.pathname,
                        'page_title': document.title
                    });
                } else {
                    console.error('Failed to restore GTM immediately');
                }
            } else {
                console.log('Statistics consent not granted, applying restrictions...');
                preventTracking();
            }

            // Hide banner and show manage button
            hideBanner();
            hideSettingsModal();

            return data;
        } catch (error) {
            console.error('Error saving consent:', error);
            alert('Failed to save consent preferences. Please try again.');
            throw error;
        }
    }

    // Initialize the consent system
    function init() {
        // Mark as initialized
        window.BOLT_CONSENT_INITIALIZED = true;
        
        // Check if consent exists and set up tracking accordingly
        const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
        
        // Create elements
        createBanner();
        
        // Check if consent already exists
        if (checkConsentExists()) {
            console.log('Consent already exists, checking preferences...');
            hideBanner();
            
            // Only restore tracking if statistics consent exists
            if (consentData.statistics) {
                console.log('Statistics consent found, restoring tracking...');
                removeTrackingPrevention();
                restoreTracking();
            } else {
                console.log('No statistics consent, maintaining tracking prevention...');
                preventTracking();
            }
        } else {
            // No consent exists, prevent tracking
            console.log('No consent exists, preventing tracking...');
            preventTracking();
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for external use
    window.boltConsent = {
        validateAndLoadGTM,
        showBanner,
        hideBanner,
        saveConsent
    };
})();