(function() {
    'use strict';

    // Force development mode for testing - change to auto-detect for production
    const CHATBOT_BASE_URL = 'http://localhost:3006'; // dev mode - backend API port
    
    // For production deployment, use:
    // const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    // const CHATBOT_BASE_URL = isProduction 
    //     ? 'https://tsindeka.merdekabattery.com' // production backend
    //     : 'http://localhost:3006'; // dev mode - backend API port

    // Ambil email user (support modern & classic)
    async function getCurrentUserEmail() {
        try {
            // Cara 1: modern/classic context info
            if (window._spPageContextInfo && window._spPageContextInfo.userEmail) {
                return window._spPageContextInfo.userEmail;
            }

            // Cara 2: SharePoint REST API
            const response = await fetch("/_api/web/currentuser?$expand=Groups", {
                method: "GET",
                headers: { "Accept": "application/json; odata=verbose" }
            });
            const user = await response.json();

            if (user && user.d && user.d.Email) {
                return user.d.Email;
            }

            return null;
        } catch (error) {
            console.error("Error getting user email:", error);
            return null;
        }
    }

    function createSSOButton() {
        if (document.getElementById('ai-chatbot-sso-btn')) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'ai-chatbot-sso-container';
        buttonContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        const ssoButton = document.createElement('button');
        ssoButton.id = 'ai-chatbot-sso-btn';
        ssoButton.innerHTML = '🤖 AI Chatbot';
        ssoButton.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        `;

        ssoButton.onclick = initiateSSO;
        buttonContainer.appendChild(ssoButton);
        document.body.appendChild(buttonContainer);
    }

    async function initiateSSO() {
        const userEmail = await getCurrentUserEmail();

        if (!userEmail) {
            alert('Unable to detect your email. Please login SharePoint.');
            return;
        }

        fetch(`${CHATBOT_BASE_URL}/api/sso/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, source: 'sharepoint' })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.loginLink) {
                window.open(data.loginLink, '_blank'); // buka chatbot di tab baru
            } else {
                throw new Error(data.error || 'SSO failed');
            }
        })
        .catch(err => {
            console.error('SSO Error:', err);
            console.error('Full error details:', err.message, err.stack);
            alert(`Failed to connect to Chatbot: ${err.message}`);
        });
    }

    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createSSOButton);
        } else {
            createSSOButton();
        }
    }

    initialize();
})();