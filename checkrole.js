function checkRole(requiredRole) {
    return function(req, res, next) {
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).send('Access forbidden — insufficient role');
        }
        next();
    };
}

module.exports = checkRole;