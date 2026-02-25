import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM ?? 'Art Therapy App <noreply@arttherapy.com>';

interface AppointmentEmailData {
  clientName: string;
  clientEmail: string;
  therapistName: string;
  therapistEmail: string;
  date: string;
  time: string;
  medium: string;
  amount?: string;
}

export const sendAppointmentConfirmation = async (data: AppointmentEmailData) => {
  const subject = 'Your session is confirmed!';
  const body = `
    <p>Hi ${data.clientName},</p>
    <p>Your art therapy session has been confirmed.</p>
    <ul>
      <li><strong>Therapist:</strong> ${data.therapistName}</li>
      <li><strong>Date:</strong> ${data.date}</li>
      <li><strong>Time:</strong> ${data.time}</li>
      <li><strong>Format:</strong> ${data.medium}</li>
      ${data.amount ? `<li><strong>Amount paid:</strong> ${data.amount}</li>` : ''}
    </ul>
    <p>See you soon!</p>
  `;

  await Promise.all([
    transporter.sendMail({ from: FROM, to: data.clientEmail, subject, html: body }),
    transporter.sendMail({
      from: FROM,
      to: data.therapistEmail,
      subject: `New confirmed session with ${data.clientName}`,
      html: `<p>You have a new confirmed session with ${data.clientName} on ${data.date} at ${data.time}.</p>`,
    }),
  ]);
};

export const sendAppointmentReminder = async (data: Omit<AppointmentEmailData, 'amount'>) => {
  await Promise.all([
    transporter.sendMail({
      from: FROM,
      to: data.clientEmail,
      subject: 'Reminder: Your session is tomorrow',
      html: `<p>Hi ${data.clientName}, this is a reminder that your session with ${data.therapistName} is tomorrow at ${data.time}.</p>`,
    }),
    transporter.sendMail({
      from: FROM,
      to: data.therapistEmail,
      subject: `Reminder: Session with ${data.clientName} tomorrow`,
      html: `<p>Reminder: You have a session with ${data.clientName} tomorrow at ${data.time}.</p>`,
    }),
  ]);
};

export const sendCancellationNotice = async (
  recipientEmail: string,
  recipientName: string,
  reason?: string
) => {
  await transporter.sendMail({
    from: FROM,
    to: recipientEmail,
    subject: 'Session cancelled',
    html: `<p>Hi ${recipientName}, your session has been cancelled.${reason ? ` Reason: ${reason}` : ''}</p>`,
  });
};
