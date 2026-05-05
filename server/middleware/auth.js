const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    const userRole = decoded.role || decoded.userRole;
    const schoolId = decoded.schoolId || decoded.schoolID || null;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.userId = userId;
    req.userRole = userRole;
    req.schoolId = schoolId;
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = { auth, authorize };
