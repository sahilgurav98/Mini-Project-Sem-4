export const isStudent = (req, res, next) => {
    // 1. Force the browser to NEVER cache this protected page
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    
    // 2. Standard auth check
    if (req.session && req.session.user && req.session.user.role === 'student') {
        next();
    } else {
        res.redirect('/auth/login/student');
    }
};

export const isAdmin = (req, res, next) => {
    // 1. Force the browser to NEVER cache this protected page
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    
    // 2. Standard auth check
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/auth/login/admin');
    }
};