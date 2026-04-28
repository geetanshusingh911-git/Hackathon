const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

function parseVoucherMessage(text) {
    const couponMatch = text.match(/Voucher code:\s*(\S+)/i);
    const rawCouponCode = couponMatch ? couponMatch[1] : null;

    const expiryMatch = text.match(/Expiring in\s+(\d+)\s+days?/i);
    let expiryDate = null;
    if (expiryMatch) {
        const days = parseInt(expiryMatch[1], 10);
        const now = new Date();
        const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        expiryDate = Math.floor(expiry.getTime() / 1000);
    }

    const priceMatch = text.match(/@₹(\d+(?:\.\d+)?)/);
    const price = priceMatch ? priceMatch[1] : null;

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let description = "";
    if (lines.length >= 3) {
        description = `${lines[1]} ${lines[2]}`;
    } else {
        description = lines.slice(1).join(' ');
    }

    const issueDate = Math.floor(Date.now() / 1000);
    const sellerWallet = process.env.SELLER_WALLET || "0xYourSellerWalletAddress";

    if (!rawCouponCode || !expiryDate || !price) {
        throw new Error("Missing required fields in the voucher text");
    }

    return {
        rawCouponCode,
        description,
        expiryDate,
        issueDate,
        price: parseFloat(price).toFixed(1),
        sellerWallet
    };
}

app.post('/parse-voucher', (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: "Missing 'text' field in request body" });
        }
        const result = parseVoucherMessage(text);
        res.json(result);
    } catch (err) {
        res.status(422).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`👉 Open your browser and go to http://localhost:${PORT}`);
});