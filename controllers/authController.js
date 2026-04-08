import Student from "../models/Student.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

// ==========================================
// RENDERS
// ==========================================

export const renderStudentLogin = (req, res) => {
  if (req.session && req.session.user && req.session.user.role === "student") {
    return res.redirect("/student/dashboard");
  }
  res.render("student/login", { error: null });
};

export const renderAdminLogin = (req, res) => {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin/login", { error: null });
};

export const renderStudentSignup = (req, res) => {
  if (req.session && req.session.user && req.session.user.role === "student") {
    return res.redirect("/student/dashboard");
  }
  res.render("student/signup", { error: null });
};

// ==========================================
// AUTHENTICATION & OTP LOGIC
// ==========================================

// 1. Send OTP for Signup
export const sendOtp = async (req, res) => {
  const { email } = req.body;

  // Backend Regex Validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|famt\.ac\.in)$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Only @gmail.com or @famt.ac.in emails are allowed.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // FIXED HERE
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Bypasses strict cloud certificate checks
      },
    });

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: "Email is already registered." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP and expiration (5 mins) in session
    req.session.signupOtp = otp;
    req.session.signupEmail = email;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;

    // Send the formal email
    await transporter.sendMail({
      from: `"Canteen DAMS Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Action Required: Canteen Portal Account Verification",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #7c3aed;">
                <h2 style="color: #111827; margin: 0; font-size: 24px;">Canteen <span style="color: #7c3aed;">DAMS</span></h2>
                <p style="color: #64748b; margin-top: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Account Security</p>
            </div>
            <div style="padding: 30px 20px; background-color: #ffffff; border-radius: 6px; margin-top: 20px;">
                <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Dear Student,</p>
                <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    We have received a request to register your email address. To complete your registration and verify your identity, please use the following One-Time Password (OTP):
                </p>
                <div style="text-align: center; background-color: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 25px;">
                    <h1 style="color: #7c3aed; font-size: 38px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', Courier, monospace;">${otp}</h1>
                </div>
                <p style="color: #334155; font-size: 15px; line-height: 1.5;">
                    <strong>Security Notice:</strong> This verification code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
                </p>
            </div>
        </div>
      `,
    });

    // Successfully sent response
    res.json({ success: true, message: "OTP sent successfully!" });

  } catch (error) {
    console.error("OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send email. Check server configuration." });
  }
};

// 2. Student Signup (Verifies OTP & Sends Welcome Email)
export const studentSignup = async (req, res) => {
  try {
    const { name, email, password, year, branch, regNo, otp } = req.body;

    // Backend Regex Check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|famt\.ac\.in)$/;
    if (!emailRegex.test(email)) {
      return res.render("student/signup", { error: "Invalid email domain." });
    }

    // Verify OTP
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

    // Hash Password & Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    await Student.create({
      name,
      email,
      password: hashedPassword,
      year,
      branch,
      regNo,
    });

    // ==========================================
    // NEW: SEND WELCOME / THANK YOU EMAIL
    // ==========================================
    try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // FIXED HERE
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Bypasses strict cloud certificate checks
      },
    });

      await transporter.sendMail({
        from: `"Canteen DAMS Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Canteen DAMS - Registration Successful",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              
              <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #7c3aed;">
                  <h2 style="color: #111827; margin: 0; font-size: 24px;">Canteen <span style="color: #7c3aed;">DAMS</span></h2>
                  <p style="color: #64748b; margin-top: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Account Confirmation</p>
              </div>
              
              <div style="padding: 30px 20px; background-color: #ffffff; border-radius: 6px; margin-top: 20px;">
                  <h3 style="color: #111827; margin-top: 0;">Registration Successful! 🎉</h3>
                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Dear <strong>${name}</strong>,
                  </p>
                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Thank you for verifying your email address. Your account for the Canteen Digital Account Management System (DAMS) has been successfully created and activated.
                  </p>
                  
                  <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #7c3aed; margin-bottom: 25px;">
                      <p style="margin: 0; color: #334155; font-size: 14px;">
                          <strong>Your Registered Details:</strong><br>
                          Registration Number: ${regNo}<br>
                          Branch & Year: ${branch} - ${year}
                      </p>
                  </div>

                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      You can now log in to the student portal to browse the menu, place live orders, and track your order history.
                  </p>
                  
                  <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                      <a href="http://localhost:3000/auth/login/student" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; display: inline-block;">Log In to Your Account</a>
                  </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      System Administrator | Canteen DAMS Portal
                  </p>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 5px;">
                      This is an automated message. Please do not reply to this email.
                  </p>
              </div>
              
          </div>
        `,
      });
      console.log(`Welcome email sent successfully to ${email}`);
    } catch (emailError) {
      // If the welcome email fails, we log it, but WE DO NOT stop the signup process.
      // The user is already registered in the DB at this point.
      console.error("Failed to send welcome email:", emailError);
    }
    // ==========================================

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

// 3. Student Login
export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });

    if (student && (await bcrypt.compare(password, student.password))) {
      req.session.user = {
        ...student.toObject(),
        role: "student",
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.render("student/login", { error: "Login failed. Please try again." });
        }
        res.redirect("/student/dashboard");
      });
    } else {
      res.render("student/login", { error: "Invalid Credentials" });
    }
  } catch (error) {
    console.error("Login System Error:", error);
    res.render("student/login", { error: "An error occurred during login." });
  }
};

// 4. Admin Login
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      req.session.user = {
        ...admin.toObject(),
        role: "admin",
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.render("admin/login", { error: "Login failed. Please try again." });
        }
        res.redirect("/admin/dashboard");
      });
    } else {
      res.render("admin/login", { error: "Invalid Admin Credentials" });
    }
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.render("admin/login", { error: "An error occurred during login." });
  }
};

// 5. Logout
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout Error:", err);
    res.redirect("/");
  });
};

// ==========================================
// PASSWORD RESET LOGIC
// ==========================================

export const sendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ success: false, message: "Email not found in our system." });
    }

      const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // FIXED HERE
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Bypasses strict cloud certificate checks
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.resetOtp = otp;
    req.session.resetEmail = email;
    req.session.resetExpires = Date.now() + 5 * 60 * 1000;

    await transporter.sendMail({
      from: `"Canteen DAMS Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Action Required: Password Reset Request",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #ef4444;">
                <h2 style="color: #111827; margin: 0; font-size: 24px;">Canteen <span style="color: #7c3aed;">DAMS</span></h2>
                <p style="color: #ef4444; margin-top: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Security Alert: Password Reset</p>
            </div>
            
            <div style="padding: 30px 20px; background-color: #ffffff; border-radius: 6px; margin-top: 20px;">
                <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    Dear <strong>${student.name}</strong>,
                </p>
                <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                    We received a request to reset the password associated with your Canteen DAMS student account. Please use the verification code below to authorize this change:
                </p>
                
                <div style="text-align: center; background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 1px dashed #f87171; margin-bottom: 25px;">
                    <h1 style="color: #dc2626; font-size: 38px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', Courier, monospace;">${otp}</h1>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.5;">
                    <strong>Security Notice:</strong> This code is valid for exactly <strong>5 minutes</strong>. Do not share this code with anyone. Canteen staff will never ask for your password or OTP.
                </p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #cbd5e1; margin-top: 25px;">
                    <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
                        <strong>Didn't request this?</strong><br>
                        If you did not request a password reset, please ignore this email. Your password will remain unchanged, and your account is secure.
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    System Administrator | Canteen DAMS Portal
                </p>
            </div>
            
        </div>
      `,
    });

    res.json({ success: true, message: "Reset OTP sent to your email!" });
  } catch (error) {
    console.error("Forgot Pass OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (
    !req.session.resetOtp ||
    req.session.resetEmail !== email ||
    req.session.resetOtp !== otp ||
    Date.now() > req.session.resetExpires
  ) {
    return res.render("student/forgot-password", { error: "Invalid or Expired OTP." });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedStudent = await Student.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true });

    req.session.resetOtp = null;
    req.session.resetEmail = null;

    // ==========================================
    // NEW: SEND PASSWORD CHANGE CONFIRMATION
    // ==========================================
    try {
      const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // FIXED HERE
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Bypasses strict cloud certificate checks
      },
    });

      await transporter.sendMail({
        from: `"Canteen DAMS Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Security Update: Password Successfully Changed",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #10b981;">
                  <h2 style="color: #111827; margin: 0; font-size: 24px;">Canteen <span style="color: #7c3aed;">DAMS</span></h2>
                  <p style="color: #10b981; margin-top: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Security Confirmation</p>
              </div>
              
              <div style="padding: 30px 20px; background-color: #ffffff; border-radius: 6px; margin-top: 20px;">
                  <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                      Dear <strong>${updatedStudent.name}</strong>,
                  </p>
                  <p style="color: #334155; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                      This email is to confirm that the password for your Canteen DAMS account has been successfully changed.
                  </p>
                  
                  <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #10b981; margin-bottom: 20px;">
                      <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
                          <strong>Important:</strong> If you did not authorize this change, please contact your System Administrator immediately to secure your account.
                      </p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                      <a href="http://localhost:3000/auth/login/student" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; display: inline-block;">Return to Login Portal</a>
                  </div>
              </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send password reset confirmation:", emailErr);
    }
    // ==========================================

    res.redirect("/auth/login/student?reset=success");
  } catch (error) {
    console.error("Password Reset Error:", error);
    res.render("student/forgot-password", { error: "Failed to reset password." });
  }
};
