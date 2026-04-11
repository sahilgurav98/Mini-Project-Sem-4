import dotenv from "dotenv";
dotenv.config();


import SibApiV3Sdk from 'sib-api-v3-sdk';

// Configure Brevo API
const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

let apiInstance;

/**
 * Initialize Brevo transporter
 */
const getTransporter = () => {
    if (!process.env.BREVO_API_KEY) {
        throw new Error(
            'BREVO_API_KEY missing. Add it to environment variables.'
        );
    }

    if (!process.env.EMAIL_USER) {
        throw new Error(
            'EMAIL_USER missing. Add verified sender email.'
        );
    }

    if (!apiInstance) {
        apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    }

    return apiInstance;
};

/**
 * Send email function (OTP / verification / reset password etc.)
 */
export const sendMail = async ({
    to,
    subject,
    html
}) => {
    const transporter = getTransporter();

    try {
        const result = await transporter.sendTransacEmail({
            sender: {
                email: process.env.EMAIL_USER
            },
            to: [
                {
                    email: to
                }
            ],
            subject: subject,
            htmlContent: html
        });

        return result;
    } catch (error) {
        console.error('Brevo Email Error:', error.message);
        throw error;
    }
};

/**
 * Build app URL helper
 */
export const buildAppUrl = (path = '/') => {
    const baseUrl = (
        process.env.APP_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        'http://localhost:3000'
    ).replace(/\/$/, '');

    const normalizedPath = path.startsWith('/')
        ? path
        : `/${path}`;

    return `${baseUrl}${normalizedPath}`;
};

