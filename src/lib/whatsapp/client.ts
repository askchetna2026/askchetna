export class WhatsAppClient {
    private accessToken: string;
    private phoneNumberId: string;
    private apiVersion: string;

    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';
    }

    private get baseUrl() {
        return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
    }

    /**
     * Sends a pre-approved template message (Utility/Marketing/Authentication).
     * Necessary for initiating a conversation outside the 24-hour service window.
     */
    async sendTemplateMessage(
        to: string,
        templateName: string,
        languageCode: string = 'en_US',
        components: any[] = []
    ) {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsApp credentials missing. Skipping sendTemplateMessage.');
            return null;
        }

        // Clean phone number (remove +, spaces, hyphens)
        const cleanTo = to.replace(/[\s\-\+]/g, '');

        const payload = {
            messaging_product: 'whatsapp',
            to: cleanTo,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: languageCode
                },
                components
            }
        };

        return this.sendRequest('/messages', payload);
    }

    /**
     * Sends a free-form text message.
     * Can only be used if the user has messaged the business within the last 24 hours.
     */
    async sendTextMessage(to: string, text: string) {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsApp credentials missing. Skipping sendTextMessage.');
            return null;
        }

        const cleanTo = to.replace(/[\s\-\+]/g, '');

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'text',
            text: {
                preview_url: false,
                body: text
            }
        };

        return this.sendRequest('/messages', payload);
    }

    private async sendRequest(endpoint: string, payload: any) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`WhatsApp API Error (${response.status}):`, JSON.stringify(errorData, null, 2));
                throw new Error(`WhatsApp API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to send WhatsApp request:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const whatsappClient = new WhatsAppClient();
