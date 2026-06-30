const crypto = require('crypto');

// Normalizes and hashes data using SHA-256 according to Meta's requirements
function hashData(value) {
    if (!value) return undefined;
    const normalized = value.toString().trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const {
            eventId,
            email,
            phone,
            firstName,
            lastName
        } = req.body;

        const PIXEL_ID = '27746921138265225';
        const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

        if (!ACCESS_TOKEN) {
            console.error('META_ACCESS_TOKEN is missing in Environment Variables.');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        // Gather user data
        const userData = {
            client_user_agent: req.headers['user-agent'],
            client_ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        };

        // Hash and append fields if they exist
        if (email) userData.em = [hashData(email)];
        if (phone) userData.ph = [hashData(phone)];
        if (firstName) userData.fn = [hashData(firstName)];
        if (lastName) userData.ln = [hashData(lastName)];

        // Construct Meta Event Payload
        const payload = {
            data: [
                {
                    event_name: 'Lead',
                    event_time: Math.floor(Date.now() / 1000), // Current time in Unix seconds
                    action_source: 'website',
                    event_id: 'TEST93833',
                    user_data: userData,
                }
            ]
        };
        console.log(payload)
        // Send POST request to Meta Graph API
        const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("response", response)
        console.log("data", data)
        if (!response.ok) {
            console.error('Meta CAPI Error:', data);
            return res.status(response.status).json({ error: 'Failed to send event to Meta', details: data });
        }

        return res.status(200).json({ success: true, metaResponse: data });
    } catch (error) {
        console.error('Error in CAPI handler:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
