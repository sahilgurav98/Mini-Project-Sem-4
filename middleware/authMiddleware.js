// Ensure user is logged in as a student
export const isStudent = (req, res, next) => {
    if (req.session.role === 'student') return next();
    res.redirect('/auth/login/student');
};

// Ensure user is logged in as an admin
export const isAdmin = (req, res, next) => {
    if (req.session.role === 'admin') return next();
    res.redirect('/auth/login/admin');
};