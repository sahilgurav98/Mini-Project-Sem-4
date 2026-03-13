import Student from "../models/Student.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
// Renders


// Smart Renders: Redirect to dashboard if already logged in!
export const renderStudentLogin = (req, res) => {
  // If a student session already exists, skip login and go straight to dashboard
  if (req.session && req.session.user && req.session.user.role === "student") {
    return res.redirect("/student/dashboard");
  }
  // Otherwise, show the login page
  res.render("student/login", { error: null });
};

export const renderAdminLogin = (req, res) => {
  // If an admin session already exists, skip login and go straight to dashboard
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return res.redirect("/admin/dashboard");
  }
  // Otherwise, show the login page
  res.render("admin/login", { error: null });
};

export const renderStudentSignup = (req, res) => {
  if (req.session && req.session.user && req.session.user.role === "student") {
    return res.redirect("/student/dashboard");
  }
  res.render("student/signup", { error: null });
};

// Student Signup
// Set up Nodemailer transporter
export const sendOtp = async (req, res) => {
  const { email } = req.body;

  // 1. Backend Regex Validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|famt\.ac\.in)$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Only @gmail.com or @famt.ac.in emails are allowed.",
      });
  }

  try {
    // --- MOVE THIS HERE ---
    // Create transporter INSIDE the function so it reads the .env file correctly
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // ----------------------

    // 2. Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered." });
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Save OTP and expiration (5 mins) in session
    req.session.signupOtp = otp;
    req.session.signupEmail = email;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;

    // 5. Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Canteen Portal - Your Verification OTP",
      html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #7c3aed;">Canteen Portal Registration</h2>
                    <p>Your 6-digit verification code is:</p>
                    <h1 style="color: #333; letter-spacing: 5px;">${otp}</h1>
                    <p style="color: #888; font-size: 12px;">This code will expire in 5 minutes. Do not share it with anyone.</p>
                </div>
            `,
    });

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    console.error("OTP Error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send email. Check server configuration.",
      });
  }
};
// UPDATED: Student Signup (Now verifies OTP)
export const studentSignup = async (req, res) => {
  try {
    const { name, email, password, year, branch, regNo, otp } = req.body;

    // 1. Backend Regex Check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|famt\.ac\.in)$/;
    if (!emailRegex.test(email)) {
      return res.render("student/signup", { error: "Invalid email domain." });
    }

    // 2. Verify OTP
    if (
      !req.session.signupOtp ||
      req.session.signupEmail !== email ||
      req.session.signupOtp !== otp ||
      Date.now() > req.session.otpExpires
    ) {
      return res.render("student/signup", {
        error: "Invalid or Expired OTP. Please request a new one.",
      });
    }

    // 3. Hash Password & Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    await Student.create({
      name,
      email,
      password: hashedPassword,
      year,
      branch,
      regNo,
    });

    // Clear OTP from session securely
    req.session.signupOtp = null;
    req.session.signupEmail = null;

    res.redirect("/auth/login/student");
  } catch (err) {
    console.error("Signup Error:", err);
    res.render("student/signup", {
      error: "Registration failed. RegNo might already exist.",
    });
  }
};


// Student Login
export const studentLogin = async (req, res) => {
  const { email, password } = req.body;
  const student = await Student.findOne({ email });
  
  if (student && (await bcrypt.compare(password, student.password))) {
    
    // Convert the Mongoose document to a plain JavaScript object 
    // and manually inject the role so the middleware can read it.
    req.session.user = {
      ...student.toObject(),
      role: "student"
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.render("student/login", {
          error: "Login failed. Please try again.",
        });
      }
      res.redirect("/student/dashboard");
    });
  } else {
    res.render("student/login", { error: "Invalid Credentials" });
  }
};


// Admin Login
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  
  if (admin && (await bcrypt.compare(password, admin.password))) {
    
    // Inject the admin role into the user object
    req.session.user = {
      ...admin.toObject(),
      role: "admin"
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.render("admin/login", {
          error: "Login failed. Please try again.",
        });
      }
      res.redirect("/admin/dashboard");
    });
  } else {
    res.render("admin/login", { error: "Invalid Admin Credentials" });
  }
};

export const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

// Send OTP for Forgot Password
export const sendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Email not found in our system." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.resetOtp = otp;
    req.session.resetEmail = email;
    req.session.resetExpires = Date.now() + 5 * 60 * 1000;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Canteen Portal - Password Reset OTP",
      html: `<h3>Your Password Reset Code is: <strong style="color:red;">${otp}</strong></h3><p>Expires in 5 minutes.</p>`,
    });

    res.json({ success: true, message: "Reset OTP sent to your email!" });
  } catch (error) {
    console.error("Forgot Pass OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
};

// Verify OTP and Reset Password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (
    !req.session.resetOtp ||
    req.session.resetEmail !== email ||
    req.session.resetOtp !== otp ||
    Date.now() > req.session.resetExpires
  ) {
    return res.render("student/forgot-password", {
      error: "Invalid or Expired OTP.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Student.findOneAndUpdate({ email }, { password: hashedPassword });

    req.session.resetOtp = null;
    req.session.resetEmail = null;

    // Redirect to login with a success flag (handled in URL)
    res.redirect("/auth/login/student?reset=success");
  } catch (error) {
    res.render("student/forgot-password", {
      error: "Failed to reset password.",
    });
  }
};
