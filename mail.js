import nodemailer from "nodemailer";
import dotenv from "dotenv"

dotenv.config()

const sendMail = async (
    toMail,
    subject,
    message
) => {
    let transporter;

    try {
        // Create the transporter
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Send the email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: toMail,
            subject: subject,
            html: message,
        });

        // Return success
        return {
            success: true,
            message: `Email sent successfully to ${toMail}`,
        };
    } catch (error) {
        // Handle errors
        return {
            success: false,
            message: "Failed to send email.",
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
};

export default sendMail;
