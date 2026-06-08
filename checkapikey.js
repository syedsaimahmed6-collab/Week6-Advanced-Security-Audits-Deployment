function checkApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.API_KEY || 'dhc-1014-saim-key-2025';

    if (!apiKey || apiKey !== validKey) {
        return res.status(401).send('Invalid or missing API key');
    }
    next();
}

module.exports = checkApiKey;