# Therapist User Manual
## Art Therapy Platform

**Version 1.0**
**Audience: Licensed Therapists**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - 1.1 [Creating Your Account](#11-creating-your-account)
   - 1.2 [Logging In and the Therapist Dashboard](#12-logging-in-and-the-therapist-dashboard)
2. [Setting Up Your Therapist Profile](#2-setting-up-your-therapist-profile)
3. [Setting Your Weekly Availability](#3-setting-your-weekly-availability)
4. [Configuring Your Payment Account](#4-configuring-your-payment-account)
   - 4.1 [Connecting with Stripe](#41-connecting-with-stripe)
   - 4.2 [Understanding Payouts](#42-understanding-payouts)
   - 4.3 [Alipay and WeChat Pay](#43-alipay-and-wechat-pay)
5. [Setting Your Refund Policy](#5-setting-your-refund-policy)
6. [Managing Personal Consultations](#6-managing-personal-consultations)
   - 6.1 [Appointment Lifecycle](#61-appointment-lifecycle)
   - 6.2 [Accepting and Managing Appointments](#62-accepting-and-managing-appointments)
   - 6.3 [Cancelling an Appointment](#63-cancelling-an-appointment)
   - 6.4 [Writing Session Notes](#64-writing-session-notes)
7. [Therapy Plans (Group Events)](#7-therapy-plans-group-events)
   - 7.1 [Plan Types](#71-plan-types)
   - 7.2 [Creating a Plan](#72-creating-a-plan)
   - 7.3 [Plan Lifecycle](#73-plan-lifecycle)
   - 7.4 [Submitting a Plan for Review](#74-submitting-a-plan-for-review)
   - 7.5 [Running a Plan](#75-running-a-plan)
   - 7.6 [Cancelling a Plan](#76-cancelling-a-plan)
   - 7.7 [Rejected Plans](#77-rejected-plans)
   - 7.8 [Moving a Finished Plan to the Gallery](#78-moving-a-finished-plan-to-the-gallery)
   - 7.9 [Plan Templates](#79-plan-templates)
8. [Forms: Assessments and Questionnaires](#8-forms-assessments-and-questionnaires)
   - 8.1 [Creating a Form](#81-creating-a-form)
   - 8.2 [Sending a Form to a Client](#82-sending-a-form-to-a-client)
   - 8.3 [Viewing Client Responses](#83-viewing-client-responses)
9. [Messages and Notifications](#9-messages-and-notifications)
10. [Managing Your Profile and Account Settings](#10-managing-your-profile-and-account-settings)
11. [Quick Reference: Key Deadlines and Rules](#11-quick-reference-key-deadlines-and-rules)

---

## 1. Getting Started

### 1.1 Creating Your Account

1. Navigate to the platform's registration page.
2. Fill in your name, email address, and a secure password.
3. When prompted to select your account type, choose **Therapist**.

   > **Note:** Selecting the correct role at registration is important. The Therapist role grants access to plan creation, availability management, payment configuration, and other features not available to clients. This selection cannot be changed after registration.

4. Agree to the platform's terms of service and complete the registration form.
5. Check your email for a verification link and confirm your address.

### 1.2 Logging In and the Therapist Dashboard

After logging in, you will be taken to the Therapist Dashboard at:

```
/dashboard/therapist
```

The dashboard is your central workspace. From here you can access the following tabs:

| Tab | Purpose |
|---|---|
| Profile | Edit your public therapist profile |
| Availability | Set your weekly recurring schedule |
| Appointments | View and manage personal consultation bookings |
| Plans | Create and manage group therapy events |
| Payments | Connect and monitor your Stripe payment account |
| Forms | Create and send assessment forms |
| Messages | View notifications and messages |

> **Important:** Until you complete your therapist profile, clients will not be able to find or book you. Profile completion is required before your listing becomes visible.

---

## 2. Setting Up Your Therapist Profile

**Location:** Dashboard → Profile tab, or navigate to `/profile`

Your therapist profile is your public-facing page. Clients use it to learn about your background, specialties, and rates before making a booking. A complete, professional profile significantly improves client trust and discoverability.

**To complete your profile:**

1. Go to the **Profile** tab on your dashboard.
2. Fill in the following fields:

   **Professional Bio**
   Write a clear summary of your background, approach to therapy, and what clients can expect when working with you. This is the primary text clients will read before booking.

   **Specialties**
   Add relevant tags to describe your areas of expertise. Examples include:
   - Trauma
   - Anxiety
   - Grief
   - Art Therapy
   - Mindfulness
   - Child and Adolescent Therapy

   Type a specialty and press Enter (or click Add) to add each tag. You can add multiple specialties.

   **Session Price (CNY)**
   Set your rate for a one-on-one Personal Consultation. This price is displayed to clients on your profile and on the booking screen. It is used to calculate the amount charged to the client and the payout transferred to you.

   **Location / City**
   Enter the city or region where you are based. This helps clients searching by location find you.

   **Profile Photo (Avatar)**
   Upload a professional headshot. A clear, professional photo increases client confidence.

   **Currently Accepting New Clients**
   Use this toggle to control whether clients can book you for new Personal Consultations. Turn this off if you are at capacity or temporarily unavailable.

3. Click **Save** to apply your changes.

> **Note:** You can return to your profile at any time to update your bio, pricing, specialties, or availability status.

---

## 3. Setting Your Weekly Availability

**Location:** Dashboard → Availability tab

Your availability schedule defines the time windows during which clients can book Personal Consultation slots with you. Clients can only request appointments that fall within your defined availability blocks.

**To set your availability:**

1. Go to the **Availability** tab on your dashboard.
2. For each day of the week you want to offer sessions, add one or more time blocks.
   - Select the **day** (e.g., Monday).
   - Enter a **start time** and **end time** (e.g., 09:00 to 17:00).
3. Repeat for each day you are available. Days with no blocks set will be shown as unavailable to clients.
4. Click **Save** to confirm your schedule.

**Examples of availability configuration:**

| Day | Start | End |
|---|---|---|
| Monday | 09:00 | 17:00 |
| Wednesday | 10:00 | 15:00 |
| Friday | 09:00 | 13:00 |

> **Note:** Changes to your availability take effect immediately for future bookings. Existing confirmed appointments are not affected by availability changes.

> **Note:** Your availability windows define when bookings are possible, but they do not automatically block off your calendar or create appointments. Clients must still submit a booking request within those windows.

---

## 4. Configuring Your Payment Account

### 4.1 Connecting with Stripe

> **Warning:** You cannot receive payment for any sessions until your Stripe Connect account is fully set up and shows an Active status. Do not accept client bookings before completing this step.

**Location:** Dashboard → Payments tab

The platform uses Stripe Connect to transfer your earnings directly to your bank account. You must complete Stripe's onboarding process before you can be paid.

**Steps to connect your payment account:**

1. Go to the **Payments** tab on your dashboard.
2. Click **Connect with Stripe**.
3. You will be redirected to Stripe's secure onboarding flow. Complete all required steps, which include:
   - Identity verification (government-issued ID)
   - Bank account details (for receiving payouts)
   - Tax information (as required in your jurisdiction)
4. Once you have completed Stripe's process, you will be returned to the platform dashboard.
5. Check the status indicator on the Payments tab. When onboarding is complete, the status will display as **Active**.

> **Note:** Stripe's identity verification may take a short time to process. If your status does not immediately show as Active, check back after a few minutes or follow any instructions sent to you by Stripe via email.

### 4.2 Understanding Payouts

Each time a client pays for a session, the platform processes the payment and transfers your share to your connected Stripe account.

**Payout breakdown:**

- **Your earnings:** 85% of the session price
- **Platform fee:** 15% of the session price

**Example:** If your session price is CNY 600, you will receive CNY 510 per completed session.

Payouts are processed according to your Stripe account's payout schedule (typically daily or weekly, depending on your country and Stripe settings).

### 4.3 Alipay and WeChat Pay

The platform also supports Alipay and WeChat Pay as payment methods for clients. Earnings from these payment methods are tracked separately and transferred to your account on a defined schedule. You can view the status of these transfers from the Payments tab.

---

## 5. Setting Your Refund Policy

**Location:** Dashboard → Settings or Profile

Your refund policy is shown to clients on the booking review screen before they confirm and pay for a session. Setting a clear policy protects both you and your clients and reduces disputes.

**Configurable options:**

**Full Refund Hours Threshold**
The number of hours before a session within which a client can cancel and receive a full refund. The default is 24 hours. For example, if set to 24, a client who cancels 25 hours before the session receives a full refund; a client who cancels 10 hours before does not.

**Allow Partial Refund**
Toggle this on or off. When enabled, clients who cancel inside the full refund window may receive a partial refund instead of no refund.

**Partial Refund Percentage**
If partial refunds are enabled, set the percentage of the session price that will be refunded. For example, 50 means the client receives half the session fee back.

**Policy Description**
Write a plain-language description of your cancellation and refund policy. This text is displayed directly to clients before they confirm their booking. Write it clearly so clients understand their rights and obligations.

**To save your refund policy:**

1. Go to the Settings or Profile section.
2. Configure the options above to match your practice policies.
3. Click **Save**.

> **Note:** When you cancel a confirmed appointment on your end, clients always receive a full refund regardless of your refund policy. The refund policy only applies to client-initiated cancellations.

---

## 6. Managing Personal Consultations

Personal Consultations are one-on-one sessions booked by individual clients. They are managed through the Appointments tab on your dashboard.

**Location:** Dashboard → Appointments tab

### 6.1 Appointment Lifecycle

Appointments move through the following statuses:

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
```

| Status | Meaning |
|---|---|
| PENDING | Client has paid and submitted the booking. Awaiting your acceptance. |
| CONFIRMED | You have accepted the appointment. The session is scheduled. |
| IN_PROGRESS | The session is currently running. |
| COMPLETED | The session has ended. |
| CANCELLED | The appointment was cancelled (by you, the client, or automatically). |

### 6.2 Accepting and Managing Appointments

> **Warning:** You must accept (confirm) a pending appointment at least 24 hours before the scheduled session time. If you have not confirmed the appointment by that deadline, it will be automatically cancelled and the client will receive a full refund.

> **Warning:** You will receive a warning notification 48 hours before a session if that appointment is still in PENDING status. Use this notification as a prompt to take action immediately.

**To accept a pending appointment:**

1. Go to the **Appointments** tab on your dashboard.
2. Locate the appointment with status **PENDING**.
3. Click the appointment to open its details.
4. Click **Accept** (or the equivalent confirmation button). The appointment status changes to **CONFIRMED**.

**To start a session:**

1. When the session time arrives, open the appointment details.
2. Click **Start Session**. The status changes to **IN_PROGRESS**.

**To complete a session:**

1. When the session has ended, open the appointment details.
2. Click **Complete Session**. The status changes to **COMPLETED**.

### 6.3 Cancelling an Appointment

You may cancel a confirmed appointment at any time before or during the session.

> **Important:** Cancelling a confirmed appointment always triggers a full refund to the client, regardless of your refund policy. Avoid cancelling confirmed appointments whenever possible.

**To cancel an appointment:**

1. Open the appointment details from the Appointments tab.
2. Click **Cancel Appointment**.
3. Confirm the cancellation when prompted.

The client will be automatically notified and refunded.

### 6.4 Writing Session Notes

Session notes are private clinical records visible only to you. You can use them to document observations, progress, treatment notes, or attach artwork produced during the session.

**To write session notes:**

1. Open an appointment that is in CONFIRMED or COMPLETED status.
2. Click the **Session Notes** tab within the appointment detail view.
3. Write your clinical notes in the text field provided.
4. Optionally, attach an artwork image by clicking the upload button. Images are stored securely via Cloudinary.
5. Click **Save Notes**.

> **Note:** Session notes are strictly private. Clients cannot see your notes at any time.

---

## 7. Therapy Plans (Group Events)

Therapy plans allow you to create and manage group-based therapy offerings. Unlike Personal Consultations, plans involve multiple participants and follow a review and publishing workflow.

### 7.1 Plan Types

| Plan Type | Description |
|---|---|
| Personal Consult | One-on-one session. Managed as appointments (see Section 6), not as a group plan. |
| Group Consultation | A structured small-group session that you facilitate. |
| Art Salon | An open creative session with a set date, time, maximum participant count, and price per seat. |
| Wellness Retreat | A multi-day programme with a defined start and end date, an itinerary of scheduled events, and a price per seat. |

### 7.2 Creating a Plan

**Location:** Dashboard → Plans tab → "Create New Plan", or navigate to `/therapy-plans/create`

**To create a new plan:**

1. Go to the **Plans** tab and click **Create New Plan**.
2. The **Therapy Plan Wizard** will open, guiding you through three distinct steps:

   ### Step 1: Metadata & Basics
   - **Title:** A clear, descriptive name for the plan.
   - **Plan Type:** Select from Group Consultation, Art Salon, or Wellness Retreat.
   - **Description:** A detailed introduction to the plan, its goals, and requirements.
   - **Price Per Seat (CNY):** The amount each participant pays.
   - **Maximum Participants:** The enrollment limit.

   ### Step 2: Schedule & Format
   - **Start & End Time:** Define the exact dates and times.
   - **Location:** Enter a physical address or a video conference link.
   - **Contact Info:** How clients can reach you with questions.

   ### Step 3: Media & Poster
   - **Poster Image:** Choose from defaults or upload your own 16:9 thumbnail.
   - **Video/Gallery (Optional):** Attach an introductory video link or upload gallery images to showcase past work.
   - **Conflict Check:** Before saving, the system will verify if your new schedule overlaps with existing appointments or plans.

4. Click **Save as Draft** to store your progress or **Submit for Review** to send it to the administrator.

### 7.3 Plan Lifecycle

Plans move through the following stages in order:

```
DRAFT → PENDING_REVIEW → PUBLISHED → SIGN_UP_CLOSED → IN_PROGRESS → FINISHED → IN_GALLERY
```

| Status | Meaning |
|---|---|
| DRAFT | Plan created but not submitted. Only visible to you. Edit freely. |
| PENDING_REVIEW | Submitted to admin for approval. No edits allowed while under review. |
| PUBLISHED | Admin approved. Plan is publicly visible and open for client sign-ups. |
| SIGN_UP_CLOSED | You have manually closed sign-ups. No new participants can join. |
| IN_PROGRESS | Session is currently running. Participants have been notified. |
| FINISHED | Session has ended. |
| IN_GALLERY | Plan has been moved to the public Gallery page. |

### 7.4 Submitting a Plan for Review

Once you are satisfied with your draft plan, you must submit it for admin review before clients can see it.

**To submit a plan:**

1. Open the plan from the **Plans** tab.
2. Click **Submit for Review** (this button appears alongside the Save Changes button when viewing a draft).
3. The platform will automatically run a **conflict check**. This checks whether the plan's scheduled time overlaps with:
   - Any of your confirmed Personal Consultation appointments
   - Any of your other active plans

   **If conflicts are detected**, the submission will be blocked and you will see a list of the conflicting appointments or plans. You must resolve these conflicts (by rescheduling or cancelling the conflicting items) before you can re-submit.

   **If no conflicts are found**, the plan moves to **PENDING_REVIEW** status.

4. Wait for the admin to review your plan. You will receive a notification when a decision is made.

### 7.5 Running a Plan

Once a plan is published and clients have signed up, follow these steps to run the session:

**Step 1: Close Sign-ups (optional but recommended before starting)**

1. Open the plan from the Plans tab.
2. Click **Close Sign-ups**.
3. The plan moves to **SIGN_UP_CLOSED** status. No additional participants can join.

**Step 2: Start the Session**

1. When the session is ready to begin, open the plan.
2. Click **Start Session**.
3. The plan moves to **IN_PROGRESS**. All enrolled participants automatically receive a notification that the session has started.

**Step 3: Finish the Session**

1. When the session has concluded, open the plan.
2. Click **Finish Session**.
3. The plan moves to **FINISHED** status.

### 7.6 Cancelling a Plan

You can cancel a plan at any active stage: Published, Sign-ups Closed, or In Progress.

> **Important:** Cancelling a plan triggers automatic full refunds to all enrolled participants and sends them a cancellation notification. This action cannot be undone.

**To cancel a plan:**

1. Open the plan from the Plans tab.
2. Click **Cancel Plan**.
3. Confirm the cancellation when prompted.

### 7.7 Rejected Plans

If an admin rejects your plan, you will receive a notification. The rejection will include a note explaining the reason.

**To respond to a rejected plan:**

1. Open the plan from the Plans tab. You will see the rejection note.
2. Edit the plan to address the issues raised.
3. Click **Submit for Review** again to re-submit.

### 7.8 Moving a Finished Plan to the Gallery

After a plan reaches FINISHED status, you can publish it to the platform's public Gallery page (`/gallery`). The Gallery is a showcase of past sessions and events that is visible to all users.

**To move a plan to the gallery:**

1. Open the finished plan.
2. Click **Move to Gallery**.
3. The plan moves to **IN_GALLERY** status and appears on the public gallery.

> **Note:** You can continue to edit the plan's description after it has been moved to the gallery. This is useful for adding post-session reflections, participant artwork, or outcome notes.

### 7.9 Plan Templates

Templates allow you to save the structure of any plan and reuse it when creating future plans of a similar type. This is especially useful for recurring programmes or events you run on a regular basis.

**To save a plan as a template:**

When creating or editing a plan, click **Save as Template** instead of (or in addition to) Save as Draft.

**To use a template when creating a new plan:**

1. Go to the **Plans** tab on your dashboard.
2. Click the **Templates** sub-tab.
3. Find the template you want to use and click **Use Template**.
4. A new draft plan will be created with the template's fields pre-filled.
5. Update the dates, pricing, and any other details specific to the new plan, then proceed as normal.

---

## 8. Forms: Assessments and Questionnaires

The Forms feature allows you to create custom forms and send them to specific clients. Use forms for intake assessments, pre-session questionnaires, consent documentation, or post-session feedback collection.

### 8.1 Creating a Form

**Location:** Dashboard → Forms tab → "New Form", or navigate to `/forms/new`

**To create a form:**

1. Go to the **Forms** tab and click **New Form**.
2. Enter a **Title** for the form (e.g., "Initial Intake Assessment" or "Post-Session Feedback").
3. Add questions by clicking **Add Question**. For each question:
   - Enter the question text.
   - Select the **question type** from the following options:

     | Type | Description |
     |---|---|
     | Short Text | A single-line text field for brief answers. |
     | Long Text (Paragraph) | A multi-line text area for detailed answers. |
     | Single Choice | A set of options where the client selects one (radio buttons). |
     | Multiple Choice | A set of options where the client can select several (checkboxes). |
     | Scale | A numeric scale (e.g., 1 to 10) for rating questions. |
     | Yes / No | A simple binary choice. |

   - For Single Choice and Multiple Choice questions, enter the available options.
   - Mark the question as **Required** or **Optional**.

4. Repeat step 3 for all questions in the form.
5. Reorder questions by dragging them if needed.
6. Click **Save** to save the form as a draft.

> **Note:** Forms saved as drafts are not visible to clients until you explicitly send them.

### 8.2 Sending a Form to a Client

**To send a form:**

1. Open the form from the **Forms** tab.
2. Click **Send to Client**.
3. A dialog will appear. Select the client you want to send the form to from your client list.
4. Click **Send**.

The client will receive an in-app notification informing them that a form is waiting for their response.

> **Note:** You can send the same form to multiple clients by repeating the send process for each client individually.

### 8.3 Viewing Client Responses

**Location:** Dashboard → Forms → select a sent form → "View Responses", or navigate to `/forms/:id/responses`

**To view responses:**

1. Go to the **Forms** tab.
2. Click on the form you want to review.
3. Click **View Responses**.
4. You will see each client's responses listed by client, with their answers displayed per question.

> **Note:** Responses are visible only to you. Clients cannot see each other's answers.

---

## 9. Messages and Notifications

The platform sends you automatic in-app notifications for key events so you can respond promptly.

**Notification triggers include:**

- A client signs up for one of your therapy plans
- A new Personal Consultation booking is submitted (PENDING)
- A client cancels an appointment or plan sign-up
- A therapy plan you submitted is approved or rejected by admin
- A pending appointment is approaching its 48-hour acceptance deadline
- A client submits a response to a form you sent

**Accessing notifications:**

- The **bell icon** in the navigation bar displays the number of unread notifications. Click it to view recent alerts.
- For a full history of messages and notifications, go to the **Messages** tab on your dashboard.

> **Note:** Check your notifications regularly, particularly for PENDING appointments that require your acceptance within the 24-hour deadline. Missing this deadline results in automatic cancellation and a full refund to the client.

---

## 10. Managing Your Profile and Account Settings

**Location:** `/profile`

You can update your personal account information at any time.

**To update your account details:**

1. Navigate to `/profile` or access your profile settings from the dashboard navigation.
2. Update any of the following fields:
   - **Name:** Your display name as shown to clients.
   - **Phone:** Your contact phone number.
   - **Avatar:** Upload a new profile photo.
3. Click **Save** to apply changes.

**To change your password:**

1. Go to your profile settings page.
2. Locate the **Change Password** section.
3. Enter your current password, then enter and confirm your new password.
4. Click **Update Password**.

> **Note:** Use a strong, unique password. If you suspect your account has been compromised, change your password immediately and contact platform support.

---

## 11. Quick Reference: Key Deadlines and Rules

This section summarises the most time-sensitive rules you need to be aware of as a therapist on the platform.

| Rule | Detail |
|---|---|
| Payment account required | You cannot receive payment until your Stripe Connect account shows Active status. Complete this setup before accepting bookings. |
| Appointment acceptance deadline | You must accept (confirm) a PENDING appointment at least 24 hours before the session. |
| Auto-cancellation on missed deadline | If a PENDING appointment is not confirmed within the 24-hour threshold, it is automatically cancelled and the client receives a full refund. |
| 48-hour warning notification | You will receive a notification 48 hours before any session that is still in PENDING status. |
| Therapist-initiated cancellation | If you cancel a CONFIRMED appointment, the client always receives a full refund, regardless of your refund policy. |
| Plan conflict check on submission | When you submit a plan for review, the system checks for time conflicts with your confirmed appointments and other active plans. Conflicts block submission. |
| Plan cancellation refunds | Cancelling a plan at any active stage triggers automatic full refunds and notifications to all enrolled participants. |
| Gallery editing | You can edit a plan's description after it has been moved to the gallery (e.g., to add post-session content). |
| Session notes privacy | Session notes are visible to you only. Clients have no access. |
| Refund policy scope | Your configured refund policy applies to client-initiated cancellations only. It does not apply when you cancel. |

---

*For technical support or to report a platform issue, contact the platform administrator through the support channel provided at registration.*
