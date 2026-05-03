const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.schoolId = decoded.schoolId;
    
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
