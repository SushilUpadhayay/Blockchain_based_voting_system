const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    // Use next(error) instead of bare throw for Express 4 compatibility
    return next(new Error('Not authorized as an admin'));
  }
};

module.exports = { admin };
