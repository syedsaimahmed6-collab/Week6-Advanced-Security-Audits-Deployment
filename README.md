# Week 6 – Advanced Security Audits & Final Deployment Security

**Intern:** Syed Saim Ahmed
**ID:** DHC-1014
**Date:** June 2026

## Overview
Week 6 was the final week of the internship. Focus was on conducting comprehensive security audits using multiple tools, ensuring OWASP Top 10 compliance, securing deployment with Docker, and performing final penetration testing.

## Security Audits Performed

### 1. OWASP ZAP Scan
**Week 1 Baseline vs Week 6 Final:**
- High Risk: 0 → 0 ✅
- Medium Risk: 5 → 0 ✅✅✅✅✅
- Low Risk: 8 → 1 ✅✅✅✅✅✅✅
- Informational: 6 → 3

### 2. Nikto Web Server Scan
- No server version exposed
- All security headers present
- No dangerous HTTP methods
- No default files found

### 3. Lynis System Audit
- Hardening Index: 67/100
- Firewall configured (UFW)
- Automatic security updates enabled
- File permissions secured

## OWASP Top 10 Compliance
| Risk | Status | Implementation |
|---|---|---|
| A01 - Broken Access Control | ✅ Protected | JWT + API key on all routes |
| A02 - Cryptographic Failures | ✅ Protected | bcrypt + HTTPS/TLS |
| A03 - Injection | ✅ Protected | Parameterized queries + input validation |
| A04 - Insecure Design | ⚠️ Partial | Rate limiting + account lockout |
| A05 - Security Misconfiguration | ✅ Protected | Helmet headers + CORS restricted |
| A06 - Vulnerable Components | ✅ Protected | Libraries updated, npm audit: 0 vulns |
| A07 - Auth & Session Failures | ✅ Protected | JWT + bcrypt + cookie flags |
| A08 - Software & Data Integrity | ⚠️ Partial | npm audit enabled |
| A09 - Logging & Monitoring | ✅ Protected | Winston logging + Fail2Ban |
| A10 - SSRF | ✅ Low Risk | No SSRF-prone features |

## Deployment & Security

### Docker Setup
- Non-root user (appuser)
- Alpine Linux base (minimal attack surface)
- Production dependencies only
- Multi-stage builds ready

### Vulnerability Scanning
- **Trivy** scan: 0 critical vulnerabilities in Docker image
- **npm audit**: 0 vulnerabilities found
- **UFW Firewall**: Only ports 5000, 8443, 22 open

### Automatic Updates
- `unattended-upgrades` configured
- Security patches applied automatically

## Final Penetration Testing Results

### 12 Attack Vectors Tested
| Attack | Tool | Result | Status |
|---|---|---|---|
| SQL Injection | SQLMap | Blocked | SECURE ✅ |
| XSS | Manual + Burp | Blocked | SECURE ✅ |
| Login Brute Force | Burp Intruder | Rate limited | SECURE ✅ |
| JWT Bypass | Burp | 403 Forbidden | SECURE ✅ |
| CSRF | Burp PoC | 403 Blocked | SECURE ✅ |
| CORS Bypass | Burp | Origin rejected | SECURE ✅ |
| Missing API Key | Manual | 401 Denied | SECURE ✅ |
| Clickjacking | Manual HTML | X-Frame-Options blocks | SECURE ✅ |
| HTTP Downgrade | Manual | HSTS redirects | SECURE ✅ |
| Server Fingerprint | Nikto + Burp | No version exposed | SECURE ✅ |
| Open Endpoints | Metasploit + Nmap | No unprotected endpoints | SECURE ✅ |
| Sensitive Data | Burp + DevTools | No data exposure | SECURE ✅ |

## How to Run

### Local Development
```bash
git clone https://github.com/YourUsername/Week6-Advanced-Security-Audits-Deployment
cd Week6-Advanced-Security-Audits-Deployment
npm install
cp .env.example .env
node index.js
```

### With Docker
```bash
docker build -t user-management-app .
docker run -p 8443:8443 -e NODE_ENV=production user-management-app
```

### Scan with Trivy
```bash
trivy image user-management-app
```

## Directory Structure

Week6-Project/
├── index.js                 # Main server with all security features
├── package.json             # Node.js dependencies
├── Dockerfile              # Docker container configuration
├── .dockerignore            # Files to exclude from Docker image
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── security.log             # Sample security events
├── middleware/
│   ├── authenticateToken.js # JWT verification
│   ├── checkApiKey.js       # API key verification
│   └── checkRole.js         # Role-based access control
└── README.md                # This file



## Security Features Summary

### Authentication & Authorization
- [x] Password hashing (bcrypt, 10 rounds)
- [x] JWT tokens (1 hour expiry)
- [x] API key authentication
- [x] Role-based access control (RBAC)
- [x] Rate limiting (100 req/15min general, 10 req/10min login)
- [x] Account lockout (5 failures = 10 min lock)

### Injection Prevention
- [x] Parameterized SQL queries
- [x] Input validation (validator library)
- [x] XSS protection (CSP header)
- [x] CSRF protection (csurf middleware)

### Data Protection
- [x] HTTPS/TLS encryption
- [x] HSTS enforcement (1 year)
- [x] Secure cookies (HttpOnly, Secure, SameSite)
- [x] Secrets in .env file (not hardcoded)

### Network Security
- [x] CORS restricted to trusted origins
- [x] Firewall (UFW) — limited ports
- [x] Reverse proxy (Nginx) with WAF ready
- [x] Header security (Helmet.js)

### Monitoring & Logging
- [x] Winston logging to file + console
- [x] Fail2Ban monitoring login attempts
- [x] Security events logged with timestamps
- [x] Failed login alerts and IP banning

### Deployment Security
- [x] Docker non-root user
- [x] Alpine Linux base image
- [x] Production dependencies only
- [x] Automatic security updates
- [x] Trivy image vulnerability scanning

## 6-Week Journey
| Week | Focus | Key Achievements |
|---|---|---|
| Week 1 | Assessment | Found 13 vulnerabilities with ZAP |
| Week 2 | Fixes | bcrypt, JWT, Helmet headers |
| Week 3 | Advanced | Logging, HTTPS, Fail2Ban |
| Week 4 | API Hardening | Rate limiting, CORS, API keys |
| Week 5 | Ethical Hacking | SQL injection fix, CSRF protection |
| Week 6 | Audits & Deploy | ZAP/Nikto/Lynis audits, Docker, final pentest |

## Tools Used Throughout
- **Assessment:** OWASP ZAP, Nmap
- **Hacking:** SQLMap, Burp Suite, Metasploit
- **Auditing:** Nikto, Lynis, Trivy
- **Deployment:** Docker, Nginx, ModSecurity
- **Code:** Node.js, Express, bcrypt, JWT, Helmet

## Final Checklist - 25 Security Items
- [x] All inputs validated and sanitized
- [x] Passwords hashed (bcrypt)
- [x] JWT authentication on protected routes
- [x] API key required on CRUD routes
- [x] CSRF protection via csurf
- [x] Rate limiting enabled
- [x] CORS restricted to trusted origins
- [x] Full CSP via Helmet
- [x] HSTS enabled (1 year)
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] X-Powered-By removed
- [x] HTTPS configured
- [x] Security logging via Winston
- [x] Fail2Ban monitoring
- [x] SQL injection fixed (parameterized queries)
- [x] XSS protected (input validation + CSP)
- [x] Secrets in .env (not hardcoded)
- [x] Docker non-root user
- [x] Docker image scanned (0 critical)
- [x] npm audit (0 vulnerabilities)
- [x] UFW firewall enabled
- [x] Automatic updates enabled
- [x] ZAP final scan (0 medium, 1 low)
- [x] Penetration test (12/12 attacks blocked)

## Contact
**Submitted by:** Syed Saim Ahmed (DHC-1014)
**Date:** June 2026
