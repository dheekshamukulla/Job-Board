import { Resend } from 'resend';

let resend;
try {
  console.log('Initializing Resend with RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (error) {
  console.error('Failed to initialize Resend:', error);
  throw error;
}

export async function sendEmail({ to, subject, html, react }) {
  console.log('sendEmail called with:', { to, subject, hasHtml: !!html, hasReact: !!react });
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return { success: false, error: 'Missing RESEND_API_KEY' };
  }
  if (!process.env.SEND_EMAIL_FROM) {
    console.error('SEND_EMAIL_FROM is not set');
    return { success: false, error: 'Missing SEND_EMAIL_FROM' };
  }
  if (!to || !subject) {
    console.error('Missing required fields: to or subject');
    return { success: false, error: 'Missing required fields: to or subject' };
  }

  try {
    const data = await resend.emails.send({
      from: process.env.SEND_EMAIL_FROM,
      to,
      subject,
      html,
      react,
    });
    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}
