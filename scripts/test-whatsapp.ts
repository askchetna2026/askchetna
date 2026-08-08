

async function testWhatsApp() {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
        console.error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env");
        process.exit(1);
    }

    const testNumber = process.argv[2];
    if (!testNumber) {
        console.error("Please provide your verified test phone number as an argument.");
        console.error("Usage: npx ts-node scripts/test-whatsapp.ts +919876543210");
        process.exit(1);
    }

    const cleanNumber = testNumber.replace(/[\s\-\+]/g, '');

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    console.log(`Sending 'hello_world' template to ${cleanNumber}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanNumber,
            type: 'template',
            template: {
                name: 'hello_world',
                language: { code: 'en_US' }
            }
        })
    });

    const data = await response.json();
    if (response.ok) {
        console.log("SUCCESS! WhatsApp message sent successfully.");
        console.log("Response:", JSON.stringify(data, null, 2));
    } else {
        console.error("FAILED to send message.");
        console.error("Error:", JSON.stringify(data, null, 2));
    }
}

testWhatsApp().catch(console.error);
