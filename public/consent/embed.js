// Execute this before anything else
(function blockImmediately() {
    // Block GA functions immediately
    window.ga = function() { return undefined; };
    window.gtag = function() { return undefined; };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push = function() { return undefined; };
    
    // Block GTM functions
    window.google_tag_manager = undefined;
    window.GoogleAnalyticsObject = undefined;
    
    // Remove any existing GA/GTM scripts
    const scripts = document.querySelectorAll('script[src*="google-analytics.com"], script[src*="gtag"], script[src*="googletagmanager.com"]');
    scripts.forEach(script => script.remove());
    
    // Clear GA cookies
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        if (cookie.includes('_ga') || cookie.includes('_gid') || cookie.includes('_gat') || 
            cookie.includes('_dc_gtm') || cookie.includes('_gcl_au')) {
            document.cookie = cookie.split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
    });
    
    // Block script creation for GA/GTM
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (value && typeof value === 'string' && (
                    value.includes('google-analytics.com') ||
                    value.includes('gtag') ||
                    value.includes('googletagmanager.com')
                )) {
                    console.log('Blocked script:', value);
                    return element;
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        return element;
    };
    
    console.log('Immediate GA/GTM blocking initialized');
})();

(function() {
    // Check if script is already initialized
    if (window.BOLT_CONSENT_INITIALIZED) {
        console.log('BoltConsent already initialized, skipping...');
        return;
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
            banner.style.display = checkConsentExists() ? 'none' : 'block';
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
                        await saveConsent(consentData);
                        // Initialize GA when accepting all
                        initializeGoogleAnalytics();
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
                        // Block GA when rejecting all
                        blockGoogleAnalytics();
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
                    
                    // First save the consent
                    await saveConsent(consentData);
                    
                    // Then handle GA based on statistics consent
                    if (consentData.statistics === true) {
                        console.log('Statistics consent granted in preferences, initializing GA...');
                        // Remove any existing GA scripts first
                        const existingScripts = document.querySelectorAll('script[src*="google-analytics.com"], script[src*="gtag"]');
                        existingScripts.forEach(script => script.remove());
                        
                        // Initialize GA
                        initializeGoogleAnalytics();
                    } else {
                        console.log('Statistics consent denied in preferences, blocking GA...');
                        blockGoogleAnalytics();
                    }
                    
                    // Hide the modal after handling GA
                    hideSettingsModal();
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
        const savedConsent = localStorage.getItem('bolt_consent');
        const savedCookieId = localStorage.getItem('bolt_consent_cookie_id');
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
            showBanner();

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
            document.cookie = `bolt_consent=${JSON.stringify(consentData)};path=/;max-age=31536000;SameSite=Strict`;
            Object.keys(consentData).forEach(category => {
                document.cookie = `bolt_consent_${category}=${consentData[category]};path=/;max-age=31536000;SameSite=Strict`;
            });
        } catch (error) {
            console.error('Error setting consent cookies:', error);
        }
    }

    // Function to save consent
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
            
            localStorage.setItem('bolt_consent', JSON.stringify(consentData));
            if (data.data && data.data.cookie_id) {
                localStorage.setItem('bolt_consent_cookie_id', data.data.cookie_id);
            }

            setConsentCookies(consentData);
            hideBanner();
            hideSettingsModal();

            return data;
        } catch (error) {
            console.error('Error saving consent:', error);
            alert('Failed to save consent preferences. Please try again.');
            throw error;
        }
    }

    // Function to block Google Analytics
    function blockGoogleAnalytics() {
        try {
            // Block GA functions
            window.ga = function() { return undefined; };
            window.gtag = function() { return undefined; };
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push = function() { return undefined; };
            
            // Remove existing GA scripts
            const scripts = document.querySelectorAll('script[src*="google-analytics.com"], script[src*="gtag"]');
            scripts.forEach(script => script.remove());
            
            // Clear GA cookies
            const cookies = document.cookie.split(';');
            cookies.forEach(cookie => {
                if (cookie.includes('_ga') || cookie.includes('_gid') || cookie.includes('_gat') || 
                    cookie.includes('_dc_gtm') || cookie.includes('_gcl_au')) {
                    document.cookie = cookie.split('=')[0] + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                }
            });
            
            console.log('Google Analytics blocked successfully');
        } catch (error) {
            console.error('Error blocking Google Analytics:', error);
        }
    }

    // Function to initialize Google Analytics
    function initializeGoogleAnalytics() {
        try {
            // Initialize GA4
            const ga4Id = 'G-8QJ7PSP28H'; // Replace with your GA4 ID
            
            // Remove any existing GA scripts first
            const existingScripts = document.querySelectorAll('script[src*="google-analytics.com"], script[src*="gtag"]');
            existingScripts.forEach(script => script.remove());
            
            // Create GA script
            const gaScript = document.createElement('script');
            gaScript.async = true;
            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
            
            // Add load event listener
            gaScript.onload = function() {
                // Initialize gtag after script loads
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ga4Id);
                console.log('Google Analytics initialized successfully');
            };
            
            document.head.appendChild(gaScript);
        } catch (error) {
            console.error('Error initializing Google Analytics:', error);
        }
    }

    // Initialize as early as possible
    function init() {
        if (window.BOLT_CONSENT_INITIALIZED) {
            console.log('BoltConsent already initialized, skipping...');
            return;
        }
        window.BOLT_CONSENT_INITIALIZED = true;
        
        // Always block GA by default
        blockGoogleAnalytics();
        
        const consentData = JSON.parse(localStorage.getItem('bolt_consent') || '{}');
        createBanner();
        
        if (checkConsentExists()) {
            console.log('Consent exists, applying saved preferences...');
            hideBanner();
            // Only initialize GA if statistics consent exists and is explicitly true
            if (consentData && consentData.statistics === true) {
                console.log('Statistics consent found, initializing GA...');
                initializeGoogleAnalytics();
            } else {
                console.log('No statistics consent, keeping GA blocked...');
                blockGoogleAnalytics();
            }
        } else {
            console.log('No consent exists, showing banner and keeping GA blocked...');
            blockGoogleAnalytics();
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
        saveConsent
    };
})();