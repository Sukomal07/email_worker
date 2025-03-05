import nodemailer from "nodemailer";
import dotenv from "dotenv"

dotenv.config()

const sendEMail = async (
    toMail,
    subject,
    message
) => {
    console.log(`Preparing to send email to: ${toMail}`);
    try {
        // Create the transporter
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465, // or 587
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Send the email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: toMail,
            subject: subject,
            html: message,
            replyTo: process.env.EMAIL_USER,
            messageId: true
        }).catch(err => console.log(err))

        console.log('Email sent successfully:', {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
        });

        return {
            success: true,
            message: `Email sent successfully to ${toMail}`,
            messageId: info.messageId
        };
    } catch (error) {
        // Handle errors
        cconsole.error(`Failed to send email to ${toMail}:`, error);
        return {
            success: false,
            message: "Failed to send email.",
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
};

export default sendEMail;
