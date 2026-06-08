require('dotenv').config();

const express        = require('express');
const bcrypt         = require('bcrypt');
const jwt            = require('jsonwebtoken');
const helmet         = require('helmet');
const cors           = require('cors');
const rateLimit      = require('express-rate-limit');
const mysql          = require('mysql');
const https          = require('https');
const fs             = require('fs');
const winston        = require('winston');
const cookieParser   = require('cookie-parser');
const csrf           = require('csurf');
const validator      = require('validator');

const authenticateToken = require('./middleware/authenticateToken');
const checkApiKey       = require('./middleware/checkApiKey');
const checkRole         = require('./middleware/checkRole');

const app = express();
app.use(express.json());
app.use(cookieParser());

// ── LOGGER ────────────────────────────────────────────
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'security.log' })
    ]
});
logger.info('Application started');

// ── HELMET SECURITY HEADERS ───────────────────────────
app.use(helmet());
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
}));
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc:              ["'self'"],
        scriptSrc:               ["'self'"],
        styleSrc:                ["'self'", "'unsafe-inline'"],
        imgSrc:                  ["'self'", "data:"],
        objectSrc:               ["'none'"],
        frameAncestors:          ["'none'"],
        formAction:              ["'self'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent:    [],
    }
}));

// ── CORS ──────────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:5000', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'CSRF-Token'],
    credentials: true
}));

// ── CSRF PROTECTION ───────────────────────────────────
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// ── RATE LIMITERS ─────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests'
});

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts'
});

app.use(generalLimiter);

// ── DATABASE ──────────────────────────────────────────
const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// ── LOGIN ATTEMPT TRACKER ─────────────────────────────
const loginAttempts = {};

// ── CSRF TOKEN ENDPOINT ───────────────────────────────
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// ── LOGIN ROUTE ───────────────────────────────────────
app.post('/login', loginLimiter, csrfProtection, async function(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        logger.warn('Login attempt with missing credentials');
        return res.status(400).send('Missing credentials');
    }

    // Account lockout check
    if (loginAttempts[username] && loginAttempts[username].count >= 5) {
        const timePassed = Date.now() - loginAttempts[username].lastAttempt;
        if (timePassed < 10 * 60 * 1000) {
            logger.warn(`Account locked: ${username}`);
            return res.status(429).send('Too many failed attempts');
        }
        loginAttempts[username] = { count: 0 };
    }

    // PARAMETERIZED QUERY — prevents SQL injection
    pool.query(
        'SELECT * FROM admin WHERE username = ?',
        [username],
        async function(err, rows) {
            if (err || rows.length === 0) {
                logger.warn(`Failed login for: ${username}`);
                return res.status(400).send('User not found');
            }

            const isMatch = await bcrypt.compare(password, rows[0].password);
            if (isMatch) {
                loginAttempts[username] = { count: 0 };
                logger.info(`Successful login: ${username}`);
                
                const token = jwt.sign(
                    {
                        id: rows[0].id,
                        username: rows[0].username,
                        role: rows[0].role || 'viewer'
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );
                
                res.status(200).send({
                    message: 'Authentication successful',
                    token,
                    csrfToken: req.csrfToken()
                });
            } else {
                if (!loginAttempts[username]) {
                    loginAttempts[username] = { count: 0 };
                }
                loginAttempts[username].count++;
                loginAttempts[username].lastAttempt = Date.now();
                
                logger.warn(
                    `Wrong password for: ${username} | Attempt #${loginAttempts[username].count}`
                );
                return res.status(401).send('Invalid credentials');
            }
        }
    );
});

// ── REFRESH TOKEN ─────────────────────────────────────
app.post('/refresh-token', authenticateToken, function(req, res) {
    const newToken = jwt.sign(
        {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    logger.info(`Token refreshed for: ${req.user.username}`);
    res.status(200).send({ token: newToken });
});

// ── CREATE USER (ADMIN ONLY) ──────────────────────────
app.post('/create',
    checkApiKey,
    authenticateToken,
    checkRole('admin'),
    csrfProtection,
    function(req, res) {
        // Input validation
        if (!req.body.Name || !req.body.StudentID) {
            return res.status(400).send('Missing required fields');
        }

        var userData = {
            name:       validator.trim(req.body.Name),
            studentID:  validator.trim(req.body.StudentID),
            department: validator.trim(req.body.Department || '')
        };

        pool.query('INSERT INTO user SET ?', userData, function(err) {
            if (err) {
                logger.error('Failed to insert user');
                return res.status(400).send('Unable to insert');
            }
            logger.info(`User created: ${userData.name}`);
            res.status(200).send('User Added');
        });
    }
);

// ── LIST USERS ────────────────────────────────────────
app.get('/list', checkApiKey, authenticateToken, function(req, res) {
    pool.query('SELECT * FROM user', (err, result) => {
        if (err) {
            logger.error('Failed to fetch users');
            return res.status(400).send('Error in Connection');
        }
        res.status(200).send(result);
    });
});

// ── DELETE USER (ADMIN ONLY) ──────────────────────────
app.delete('/delete/:id',
    checkApiKey,
    authenticateToken,
    checkRole('admin'),
    csrfProtection,
    function(req, res) {
        const id = validator.trim(req.params.id);
        
        pool.query(
            'DELETE FROM user WHERE studentID = ?',
            [id],
            (err) => {
                if (err) {
                    logger.error(`Failed to delete user: ${id}`);
                    return res.status(400).send('User not found');
                }
                logger.info(`User deleted: ID ${id}`);
                
                pool.query('SELECT * FROM user', (err, result) => {
                    if (err) return res.status(400).send('Error');
                    res.status(200).send(result);
                });
            }
        );
    }
);

// ── CSRF ERROR HANDLER ────────────────────────────────
app.use(function(err, req, res, next) {
    if (err.code === 'EBADCSRFTOKEN') {
        logger.warn(`CSRF attack detected from IP: ${req.ip}`);
        return res.status(403).send('Invalid CSRF token');
    }
    next(err);
});

// ── HTTPS SERVER ──────────────────────────────────────
const httpsOptions = {
    key:  fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

https.createServer(httpsOptions, app).listen(8443, () => {
    logger.info('HTTPS Server running on port 8443');
    console.log('Server running on https://localhost:8443');
});