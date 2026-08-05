import nodemailer from 'nodemailer';

const smtpPort = Number.parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const reportFromEmail = process.env.REPORT_MAIL_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || smtpUser;
const reportFromName = process.env.REPORT_MAIL_FROM_NAME || process.env.MAIL_FROM_NAME || 'AskChetna Astrology';
const reportReplyTo = process.env.REPORT_MAIL_REPLY_TO || process.env.MAIL_REPLY_TO;

const newsletterFromEmail = process.env.NEWSLETTER_MAIL_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || smtpUser;
const newsletterFromName = process.env.NEWSLETTER_MAIL_FROM_NAME || process.env.MAIL_FROM_NAME || 'AskChetna Updates';
const newsletterReplyTo = process.env.NEWSLETTER_MAIL_REPLY_TO || process.env.MAIL_REPLY_TO;

const lifecycleFromEmail = process.env.LIFECYCLE_MAIL_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || smtpUser;
const lifecycleFromName = process.env.LIFECYCLE_MAIL_FROM_NAME || process.env.MAIL_FROM_NAME || 'AskChetna Guide';
const lifecycleReplyTo = process.env.LIFECYCLE_MAIL_REPLY_TO || process.env.MAIL_REPLY_TO;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
    } : undefined,
});

function formatFrom(email: string | undefined, name: string) {
    if (!email) return undefined;
    return `"${name}" <${email}>`;
}

export async function sendLifeReportEmail(to: string, userName: string, reportContent: any, pdfBuffer?: Buffer) {
    const mailOptions: any = {
        from: formatFrom(reportFromEmail, reportFromName),
        to,
        subject: `Your Premium Life Guidance Report - ${userName}`,
        html: `
            <div style="font-family: serif; color: #101010; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #d4af37; border-radius: 8px;">
                <h1 style="color: #d4af37; text-align: center;">AskChetna</h1>
                <p>Namaste <b>${userName}</b>,</p>
                <p>Your Premium Life Guidance Report is now ready. Below is a summary of your cosmic journey.</p>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />

                <h2 style="color: #d4af37;">1. Your Soul's Calling</h2>
                <p>${reportContent.chapter1_SoulPurpose.substring(0, 300)}...</p>

                <h2 style="color: #d4af37;">2. The Next 12 Months</h2>
                <p>${reportContent.chapter5_YearlyHorizon.substring(0, 300)}...</p>

                <p style="font-size: 1.1rem; color: #d4af37; text-align: center; margin: 20px 0;">
                    <b>Plus 8 more deep chapters on Career, Love, Health, Strengths, and Practical Remedies.</b>
                </p>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />

                <div style="background: #fdfaf0; padding: 20px; border-radius: 8px; text-align: center;">
                    <p><b>Your professional 10-page PDF report is attached to this email.</b></p>
                    <p style="font-size: 0.9rem; color: #666;">
                        You can also view the full interactive report and download it anytime from your dashboard.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background: #d4af37; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
                </div>

                <p style="margin-top: 40px; font-size: 0.8rem; color: #999; text-align: center; font-style: italic;">
                    "Awareness, not prediction."
                </p>
            </div>
        `,
    };

    if (reportReplyTo) {
        mailOptions.replyTo = reportReplyTo;
    }

    if (pdfBuffer) {
        mailOptions.attachments = [{
            filename: `AskChetna_Life_Report_${userName}.pdf`,
            content: pdfBuffer
        }];
    }

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, error };
    }
}

export async function sendContactEmail(name: string, email: string, subject: string, message: string) {
    const contactTo = process.env.CONTACT_MAIL_TO || process.env.MAIL_REPLY_TO || smtpUser || 'hello@askchetna.com';

    const mailOptions: any = {
        from: formatFrom(reportFromEmail, reportFromName),
        to: contactTo,
        replyTo: `"${name}" <${email}>`,
        subject: `[Contact] ${subject}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #d4af37;">New contact message — AskChetna</h2>
                <p><b>Name:</b> ${name}</p>
                <p><b>Email:</b> ${email}</p>
                <p><b>Subject:</b> ${subject}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
                <p style="white-space: pre-wrap; line-height: 1.6; color: #333;">${message}</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Contact email error:', error);
        return { success: false, error };
    }
}

export async function sendNewsletter(to: string[], subject: string, content: string) {
    if (to.length === 0) return { success: true, count: 0 };

    const mailOptions: any = {
        from: formatFrom(newsletterFromEmail, newsletterFromName),
        bcc: to,
        subject,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="margin-bottom: 20px; text-align: center;">
                    <h2 style="color: #d4af37;">AskChetna</h2>
                </div>
                <div style="color: #333; line-height: 1.6;">
                    ${content}
                </div>
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8rem; color: #999; text-align: center;">
                    <p>You are receiving this because you subscribed to AskChetna updates.</p>
                    <p>"Awareness, not prediction."</p>
                </div>
            </div>
        `
    };

    if (newsletterReplyTo) {
        mailOptions.replyTo = newsletterReplyTo;
    }

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, count: to.length };
    } catch (error) {
        console.error('Newsletter Error:', error);
        return { success: false, error };
    }
}

export async function sendLifecycleEmailMessage(to: string, subject: string, html: string) {
    const mailOptions: any = {
        from: formatFrom(lifecycleFromEmail, lifecycleFromName),
        to,
        subject,
        html,
    };

    if (lifecycleReplyTo) {
        mailOptions.replyTo = lifecycleReplyTo;
    }

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Lifecycle email error:', error);
        return { success: false, error };
    }
}


/**
 * Appointment reminder, sent alongside the push notification.
 *
 * Plain and short by design: this arrives on a phone an hour before a reading,
 * and the only things that matter are who, when, and how to get there.
 */
export async function sendAppointmentReminderEmail(
    to: string,
    d: {
        seekerName: string;
        astrologerName: string;
        when: string;
        lead: '24 hours' | '1 hour';
        ref: string;
    }
) {
    if (!process.env.SMTP_HOST) {
        console.error('Appointment reminder skipped: SMTP is not configured.');
        return;
    }

    const soon = d.lead === '1 hour';
    const subject = soon
        ? `Your reading with ${d.astrologerName} starts soon`
        : `Reminder: your reading with ${d.astrologerName} tomorrow`;

    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:28px;
                  background:#F2EAD5;color:#251A11">
        <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;
                  color:#5C3D0A;margin:0 0 18px">AskChetna</p>
        <h1 style="font-size:20px;margin:0 0 14px">Namaste ${d.seekerName},</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px">
          Your reading with <strong>${d.astrologerName}</strong> is
          ${soon ? 'about an hour away' : 'tomorrow'}.
        </p>
        <p style="font-size:17px;margin:0 0 22px;padding:14px 16px;
                  background:#F6F0DF;border:1px solid #D3C29C">${d.when} IST</p>
        <a href="https://www.askchetna.com/dashboard"
           style="display:inline-block;background:#7A2C12;color:#FBF6E8;
                  padding:12px 24px;text-decoration:none;font-size:13px;
                  letter-spacing:.06em;text-transform:uppercase">Open AskChetna</a>
        <p style="font-size:12px;color:#5C4A32;margin:24px 0 0">
          Reference ${d.ref}. If you can no longer make it, cancel from your
          dashboard — credits are returned in full up to 12 hours before.
        </p>
      </div>`;

    await transporter.sendMail({
        from: formatFrom(lifecycleFromEmail, lifecycleFromName),
        replyTo: lifecycleReplyTo,
        to,
        subject,
        html,
    });
}
