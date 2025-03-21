(function() {
    // Execute this before anything else
    (function blockBeforeLoad() {
        try {
            // Check for existing consent first
            const savedConsent = localStorage.getItem('bolt_consent');
            const consentData = savedConsent ? JSON.parse(savedConsent) : null;
            
            // If no consent or rejected, block all tracking cookies immediately
            if (!consentData || !consentData.statistics) {
                // Block script execution before it starts
                const existingScripts = document.querySelectorAll('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]');
                existingScripts.forEach(script => {
                    script.parentNode.removeChild(script);
                    console.log('Blocked script:', script.src);
                });

                // Remove any existing tracking cookies
                const cookiesToRemove = [
                    '_ga', '_gid', '_gat', '_ga_', 'collect', '_dc_gtm', '_gcl_au',
                    'AMP_TOKEN', '_gac_', '_fbp', '_fbc', '_utm_'
                ];
                const domains = [window.location.hostname, '.' + window.location.hostname];
                const paths = ['/', '/path'];

                cookiesToRemove.forEach(cookieName => {
                    domains.forEach(domain => {
                        paths.forEach(path => {
                            document.cookie = `${cookieName}=; domain=${domain}; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=strict`;
                        });
                    });
                });

                // Block GTM and GA objects immediately
                window.dataLayer = [];
                window.gtag = function() { return undefined; };
                window.ga = function() { return undefined; };
                window.google_tag_manager = undefined;
                window.GoogleAnalyticsObject = undefined;

                console.log('Initial blocking executed successfully - No consent');
            } else {
                // If consent exists and statistics are allowed, allow tracking cookies
                console.log('Consent exists, allowing tracking based on preferences');
            }
        } catch (error) {
            console.error('Error in initial blocking:', error);
            // If there's an error, block everything by default
            window.dataLayer = [];
            window.gtag = function() { return undefined; };
            window.ga = function() { return undefined; };
        }
    })();

    // Track blocking state
    let isTrackingBlocked = true; // Set to true by default
    
    // Store MutationObserver instance
    let observer = null;

    // Store original functions
    const originalFunctions = {
        createElement: document.createElement,
        cookieDesc: Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                   Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie')
    };

    // Block tracking immediately before anything else executes
    (function blockImmediately() {
        // Block script loading
        document.createElement = function(tagName) {
            const element = originalFunctions.createElement.call(document, tagName);
            if (tagName.toLowerCase() === 'script') {
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (value && typeof value === 'string' && (
                        value.includes('googletagmanager.com') ||
                        value.includes('google-analytics.com') ||
                        value.includes('analytics') ||
                        value.includes('gtag') ||
                        value.includes('gtm')
                    )) {
                        console.log('Blocked script loading:', value);
                        return element;
                    }
                    return originalSetAttribute.call(this, name, value);
                };
            }
            return element;
        };

        // Block cookies immediately
        if (originalFunctions.cookieDesc && originalFunctions.cookieDesc.configurable) {
            Object.defineProperty(document, 'cookie', {
                get: function() {
                    return originalFunctions.cookieDesc.get.call(document);
                },
                set: function(val) {
                    if (val.match(/^(_ga|_gid|_gat|_ga_|collect|_dc_gtm|_gcl_|AMP_TOKEN|_fbp|_fbc|_utm_)/i)) {
                        console.log('Blocked cookie:', val);
                        return;
                    }
                    originalFunctions.cookieDesc.set.call(document, val);
                },
                configurable: true
            });
        }

        // Set up aggressive MutationObserver
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT') {
                        const src = node.src || '';
                        if (src.includes('googletagmanager.com') ||
                            src.includes('google-analytics.com') ||
                            src.includes('gtag') ||
                            src.includes('analytics')) {
                            node.parentNode.removeChild(node);
                            console.log('Blocked dynamic script:', src);
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
        window.dataLayer = {
            push: function() {
                console.log('Blocked dataLayer push');
                return;
            }
        };

        // Block all tracking functions
        window.ga = function() { console.log('Blocked GA call'); return undefined; };
        window.gtag = function() { console.log('Blocked gtag call'); return undefined; };
        window.google_tag_manager = undefined;
        window.GoogleAnalyticsObject = undefined;

        console.log('Tracking prevention initialized');
    })();

    // Execute blocking immediately before anything else loads
    (function executeImmediately() {
        try {
            // Check consent state immediately
            const savedConsent = localStorage.getItem('bolt_consent');
            const consentData = savedConsent ? JSON.parse(savedConsent) : null;
            const isTrackingAllowed = consentData && consentData.statistics === true;

            if (!isTrackingAllowed) {
                console.log('No tracking consent, ensuring tracking remains blocked');
                isTrackingBlocked = true;
                blockTrackingImmediately();
            }
        } catch (error) {
            console.error('Error in immediate execution:', error);
            // If there's an error, ensure tracking remains blocked
            isTrackingBlocked = true;
            blockTrackingImmediately();
        }
    })();

    // Check if script is already initialized
    if (window.BOLT_CONSENT_INITIALIZED) {
        console.log('BoltConsent already initialized, skipping...');
        return;
    }

    // Default configuration
    const defaultConfig = {
        scriptId: null,
        apiKey: null,
        apiUrl: 'http://cokkiesconsent.local/api',
        gtmId: null  // Add GTM ID to default configuration
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

    // Define consent states
    const CONSENT_STATES = {
        GRANTED: 'granted',
        DENIED: 'denied'
    };

    // Function to update GTM consent state
    function updateGTMConsentState(consentData) {
        console.log('Updating GTM consent state with data:', consentData);
        
        // Initialize dataLayer if it doesn't exist
        window.dataLayer = window.dataLayer || [];

        // Default to denied state
        const consentState = {
            ad_storage: CONSENT_STATES.DENIED,
            analytics_storage: CONSENT_STATES.DENIED,
            personalization_storage: CONSENT_STATES.DENIED,
            functionality_storage: CONSENT_STATES.DENIED,
            security_storage: CONSENT_STATES.GRANTED // Always enabled for security
        };

        // Update consent state based on user preferences
        if (consentData) {
            // Update advertising consent
            if (consentData.marketing) {
                consentState.ad_storage = CONSENT_STATES.GRANTED;
            }

            // Update analytics consent
            if (consentData.statistics) {
                consentState.analytics_storage = CONSENT_STATES.GRANTED;
            }

            // Update personalization consent
            if (consentData.preferences) {
                consentState.personalization_storage = CONSENT_STATES.GRANTED;
            }

            // Update functionality consent
            if (consentData.necessary) {
                consentState.functionality_storage = CONSENT_STATES.GRANTED;
            }
        }

        console.log('Pushing consent state to dataLayer:', consentState);

        // Push consent state to dataLayer
        try {
            window.dataLayer.push({
                event: 'consent_update',
                consent_state: consentState
            });

            console.log('Successfully pushed to dataLayer');
        } catch (error) {
            console.warn('Error updating GTM consent state:', error);
        }
    }

    // Function to block tracking immediately
    function blockTrackingImmediately() {
        if (isTrackingBlocked) {
            console.log('Tracking already blocked, skipping...');
            return;
        }
        
        console.log('Blocking tracking immediately');
        isTrackingBlocked = true;

        // Remove any existing analytics cookies first
        removeAnalyticsCookies();

        // Block analytics cookies
        const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                           Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

        if (cookieDesc && cookieDesc.configurable) {
            Object.defineProperty(document, 'cookie', {
                get: function() {
                    return cookieDesc.get.call(document);
                },
                set: function(val) {
                    // Block all analytics and tracking cookies
                    if (val.match(/^(_ga|_gid|_gat|_ga_|collect|_dc_gtm|_gcl_|AMP_TOKEN|_fbp|_utm_)/)) {
                        console.log('Blocked cookie:', val);  // For debugging
                        return;
                    }
                    cookieDesc.set.call(document, val);
                },
                configurable: true
            });
        }

        // Block GTM and GA initialization
        window.dataLayer = window.dataLayer || [];
        const originalPush = Array.prototype.push;
        window.dataLayer.push = function() {
            const args = Array.prototype.slice.call(arguments);
            
            // Block specific GTM and GA initialization events
            if (args[0] && (
                args[0].event === 'gtm.js' || 
                args[0]['gtm.start'] || 
                args[0].event === 'gtm.dom' ||
                args[0].event === 'gtm.load' ||
                args[0].event === 'gtm.init'  // Additional events to block
            )) {
                console.warn('Blocked GTM event:', args[0].event);  // Using console.warn for better visibility
                return; // Prevent pushing the blocked event
            }

            // Proceed with other events
            return originalPush.apply(this, arguments);
        };

        // Block script injection for analytics and tracking scripts
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(document, tagName);

            // Check if the created element is a script tag
            if (tagName.toLowerCase() === 'script') {
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    // Block script injection based on specific URLs or patterns
                    if (value && typeof value === 'string' && (
                        value.includes('googletagmanager.com') ||
                        value.includes('google-analytics.com') ||
                        value.includes('analytics') ||
                        value.includes('gtag') ||
                        value.includes('facebook.com/tr') ||   // Example: block Facebook Pixel
                        value.includes('twitter.com')          // Example: block Twitter Pixel
                    )) {
                        console.warn('Blocked script:', value);  // Use console.warn for visibility
                        return;  // Prevent the script from being injected
                    }
                    return originalSetAttribute.call(this, name, value);  // Proceed with normal behavior
                };
            }
            return element;
        };

        // Block GA functions
        window.ga = function() {
            console.log('Blocked GA call');
            return undefined;
        };
        window.gtag = function() {
            console.log('Blocked gtag call');
            return undefined;
        };

        // Remove existing GTM/GA scripts
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
            const src = scripts[i].src || '';
            if (src.includes('googletagmanager.com') || 
                src.includes('google-analytics.com')) {
                scripts[i].parentNode.removeChild(scripts[i]);
                console.log('Removed tracking script:', src);
            }
        }

        console.log('Tracking blocked successfully');
    }

    // Function to restore tracking based on consent
    function restoreTracking(consentData) {
        console.log('Attempting to restore tracking functionality...');

        try {
            if (consentData && consentData.statistics) {
                // Remove any existing GTM/GA instances
                window.dataLayer = [];
                window.google_tag_manager = undefined;
                window.ga = undefined;
                window.gtag = undefined;
                
                // Remove existing GTM scripts to prevent conflicts
                const existingScripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
                existingScripts.forEach(script => script.remove());

                // Initialize GTM with consent state
                initializeGTM(consentData);

                isTrackingBlocked = false;
                console.log('Tracking functionality restored');
            }
        } catch (error) {
            console.error('Error restoring tracking:', error);
        }
    }

    // Function to remove tracking prevention
    function removeTrackingPrevention() {
        console.log('Removing tracking prevention...');
        
        try {
            // Disconnect and remove the MutationObserver
            if (observer) {
                observer.disconnect();
                observer = null;
                console.log('Disconnected MutationObserver');
            }

            // Restore original document.createElement
            if (originalFunctions && originalFunctions.createElement) {
                document.createElement = originalFunctions.createElement;
            }

            // Restore original cookie functionality
            if (originalFunctions && originalFunctions.cookieDesc && originalFunctions.cookieDesc.configurable) {
                Object.defineProperty(document, 'cookie', originalFunctions.cookieDesc);
            }

            // Clear any blocking functions
            window.ga = undefined;
            window.gtag = undefined;
            window.google_tag_manager = undefined;
            window.GoogleAnalyticsObject = undefined;
            
            // Reset dataLayer to ensure clean state
            window.dataLayer = [];

            isTrackingBlocked = false;
            console.log('Tracking prevention removed successfully');
        } catch (error) {
            console.error('Error removing tracking prevention:', error);
        }
    }

    // Helper function to check if tracking is allowed
    function isTrackingAllowed() {
        const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
        return consentData.statistics === true;
    }

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
                            consentData[category.key] = true;
                        });
                        
                        // Save consent first
                        await saveConsent(consentData);
                        
                        // Initialize GTM with full consent
                        initializeGTM(consentData);
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
                        // Remove analytics cookies before saving consent
                        removeAnalyticsCookies();
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
        } catch (error) {
            console.error('Error setting consent cookies:', error);
        }
    }

    // Function to remove analytics cookies
    function removeAnalyticsCookies() {
        const cookiesToRemove = ['_ga', '_gid', '_gat', '_ga_', 'collect', '_dc_gtm', '_gcl_au', 'AMP_TOKEN'];
        const domain = window.location.hostname;
        cookiesToRemove.forEach(name => {
            document.cookie = `${name}=; domain=${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
            document.cookie = `${name}=; domain=.${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        });
    }

    // Function to save consent
    async function saveConsent(consentData) {
        try {
            console.log('Saving consent with script ID:', config.scriptId);
            console.log('Consent data:', consentData);

            // Handle cookies based on consent type
            if (!consentData.statistics) {
                // Remove all tracking cookies if statistics not allowed
                removeAnalyticsCookies();
                blockTrackingImmediately();
            } else {
                // Allow tracking cookies and restore tracking
                await restoreTracking(consentData);
            }

            // Update GTM consent state immediately
            updateGTMConsentState(consentData);

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

            // Set consent cookies
            setConsentCookies(consentData);

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

    // Function to initialize GTM with proper consent state
    function initializeGTM(consentData) {
        // Initialize dataLayer with consent state first
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': 'consent_update',
            'consent_state': {
                'ad_storage': consentData.marketing ? 'granted' : 'denied',
                'analytics_storage': consentData.statistics ? 'granted' : 'denied',
                'functionality_storage': consentData.necessary ? 'granted' : 'denied',
                'personalization_storage': consentData.preferences ? 'granted' : 'denied',
                'security_storage': 'granted'
            }
        });

        // Load GTM script
        const gtmId = 'GTM-5P43TF9P';
        const gtmScript = document.createElement('script');
        gtmScript.async = true;
        gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
        document.head.appendChild(gtmScript);

        console.log('GTM initialized with consent state');
    }

    // Initialize as early as possible but after blocking is set up
    function init() {
        // Mark as initialized
        if (window.BOLT_CONSENT_INITIALIZED) {
            console.log('BoltConsent already initialized, skipping...');
            return;
        }
        window.BOLT_CONSENT_INITIALIZED = true;
        
        const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
        
        // Always ensure tracking is blocked first
        blockTrackingImmediately();
        
        // Create banner
        createBanner();
        
        // Check existing consent
        if (checkConsentExists()) {
            console.log('Consent exists, applying saved preferences...');
            hideBanner();
            
            if (consentData.statistics) {
                console.log('Statistics consent granted, restoring tracking...');
                setTimeout(() => {
                    restoreTracking(consentData);
                }, 0);
            } else {
                console.log('Statistics consent denied, ensuring tracking remains blocked...');
                removeAnalyticsCookies();
                blockTrackingImmediately();
            }
        } else {
            console.log('No consent exists, blocking all tracking...');
            removeAnalyticsCookies();
            blockTrackingImmediately();
            updateGTMConsentState({});
        }
    }

    // Execute initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for external use
    window.boltConsent = {
        showBanner,
        hideBanner,
        saveConsent,
        isTrackingAllowed
    };
})();