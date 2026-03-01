# Administrator User Manual
## Art Therapy Web Application

**Audience:** Platform Administrators
**Version:** 1.0
**Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Accessing the Platform](#2-accessing-the-platform)
3. [Admin Dashboard](#3-admin-dashboard)
4. [User Management (Users Tab)](#4-user-management-users-tab)
   - 4.1 [Viewing and Searching Users](#41-viewing-and-searching-users)
   - 4.2 [Deactivating and Reactivating Accounts](#42-deactivating-and-reactivating-accounts)
5. [Therapy Plan Review (Plans Tab)](#5-therapy-plan-review-plans-tab)
   - 5.1 [Review Queue Overview](#51-review-queue-overview)
   - 5.2 [Approving a Therapy Plan](#52-approving-a-therapy-plan)
   - 5.3 [Rejecting a Therapy Plan](#53-rejecting-a-therapy-plan)
   - 5.4 [Cancelling an Active Plan](#54-cancelling-an-active-plan)
   - 5.5 [Editing a Plan](#55-editing-a-plan)
6. [Revenue Analytics (Revenue Tab)](#6-revenue-analytics-revenue-tab)
7. [Messaging (Messages Tab)](#7-messaging-messages-tab)
   - 7.1 [Viewing Received Messages](#71-viewing-received-messages)
   - 7.2 [Sending a Broadcast Message](#72-sending-a-broadcast-message)
8. [Platform-Wide Visibility](#8-platform-wide-visibility)
9. [Platform Configuration Notes](#9-platform-configuration-notes)
10. [Quick Reference](#10-quick-reference)

---

## 1. Overview

Administrators are responsible for overseeing the entire art therapy platform. Admin responsibilities include:

- Reviewing and approving or rejecting therapy plans submitted by therapists
- Managing user accounts (clients and therapists)
- Monitoring platform revenue and transaction analytics
- Communicating with users via broadcast or direct messages
- Intervening in exceptional situations, such as cancelling active plans on behalf of therapists

Admin accounts are not self-registered. They are provisioned directly in the database by the development team. If you require an admin account to be created or modified, contact the development team.

---

## 2. Accessing the Platform

Admins log in using the same login page as all other users.

**Login URL:** `/login`

There is no separate admin login URL. After a successful login, the platform detects your admin role and automatically redirects you to the admin dashboard at `/dashboard/admin`.

> **Note:** Admin role assignment is handled at the database level. Admins cannot promote other users to admin status through the application interface. Contact the development team for any admin account changes.

---

## 3. Admin Dashboard

After login, you are directed to the Admin Dashboard at `/dashboard/admin`. The dashboard is organized into four tabs:

| Tab | Purpose |
|---|---|
| **Users** | View and manage all registered user accounts |
| **Plans** | Review therapy plans submitted for approval |
| **Revenue** | View payment analytics and financial summaries |
| **Messages** | Send and receive messages, including broadcast announcements |

Each tab is described in detail in the sections that follow.

---

## 4. User Management (Users Tab)

### 4.1 Viewing and Searching Users

The Users tab displays a list of all registered users on the platform, including both clients and therapists.

Each user row displays the following information:

- **Name** — the user's full registered name
- **Email** — the user's email address
- **Role** — either CLIENT or THERAPIST
- **Joined Date** — the date the account was created
- **Status** — Active or Inactive

**To filter or search users:**

1. Navigate to Dashboard → Users tab.
2. Use the role filter to display only CLIENTS or only THERAPISTS, or leave it unfiltered to view all users.
3. Use the search field to find users by name or email address.
4. Click any user row to open that user's full profile details.

### 4.2 Deactivating and Reactivating Accounts

Admins can deactivate a user account to prevent that user from accessing the platform. Deactivation does not delete the account or its associated data.

**To deactivate an account:**

1. Navigate to Dashboard → Users tab.
2. Search or filter to locate the user.
3. Click the user's row to open their profile.
4. Toggle the account status from Active to Inactive.
5. Confirm the action when prompted.

**To reactivate a deactivated account:**

1. Follow the same steps above.
2. Toggle the account status from Inactive to Active.

> **Note:** Admins cannot directly reset user passwords. Password resets are handled by users themselves through the standard password-reset flow. If a user is locked out of their account, direct them to use the "Forgot Password" option on the login page.

---

## 5. Therapy Plan Review (Plans Tab)

Therapists submit therapy plans that must be reviewed and approved by an admin before they become publicly visible to clients. The Plans tab is the primary workspace for this function.

### 5.1 Review Queue Overview

The Plans tab displays all plans currently awaiting review. These plans carry a status of **PENDING_REVIEW** and are shown with a yellow "Pending Review" badge.

Each plan entry in the queue displays:

- **Plan Title**
- **Plan Type** — one of: Group Consult, Art Salon, or Wellness Retreat
- **Therapist Name** — the therapist who submitted the plan
- **Submitted Date** — the date the plan was submitted for review

Click any plan row to open the full plan details, including: description, schedule, location, pricing, maximum participant count, and the uploaded poster image.

### 5.2 Approving a Therapy Plan

Before approving a plan, review it carefully to ensure the content is accurate, professional, and does not contain misleading information. Verify that the schedule, price, and description are clearly stated.

**To approve a therapy plan:**

1. Log in as admin and navigate to Dashboard → Plans tab.
2. Locate the plan you wish to review. It will have a yellow "Pending Review" badge.
3. Click the plan row to open the full plan details.
4. Review the description, schedule, location, price, participant limit, and poster.
5. If the plan meets platform standards, click "Approve".
6. The plan status changes immediately to **PUBLISHED**.
7. The plan becomes publicly visible at `/therapy-plans` and is available for client sign-ups via the **Standard Payment Workflow**.
8. The therapist receives an in-app notification confirming approval.

> **Note:** Approval is immediate. Once approved, the plan is live. If you identify an issue after approval, you may edit the plan or, in serious cases, cancel it (see Section 5.4).

### 5.3 Rejecting a Therapy Plan

If a plan does not meet platform standards, or if key information is missing or unclear, you must reject it and provide the therapist with a clear explanation of what needs to be corrected.

**To reject a therapy plan:**

1. Open the plan from the Plans tab.
2. Click "Reject".
3. In the rejection note field, enter a clear and specific explanation of what the therapist must change. For example: "Please provide more detail in the introduction and clarify the session price."
4. Submit the rejection.
5. The plan status changes to **REJECTED**.
6. The therapist receives an in-app notification that includes your rejection note.
7. The therapist may edit the plan and resubmit it for review, at which point it will reappear in the review queue.

> **Best practice:** Rejection notes should be specific and actionable. Vague feedback such as "needs improvement" is not helpful to therapists and may result in repeated resubmissions. Clearly identify each item that requires attention.

### 5.4 Cancelling an Active Plan

In exceptional circumstances — for example, when a therapist is unable to run a plan and cannot cancel it themselves — admins can cancel any active plan.

This action applies to plans with any of the following statuses:
- PUBLISHED
- SIGN_UP_CLOSED
- IN_PROGRESS

**To cancel an active plan:**

1. Navigate to Dashboard → Plans tab.
2. Filter by status (Published, Sign-Up Closed, or In Progress) to locate the plan.
3. Open the plan.
4. Click "Cancel Plan".
5. Review the confirmation prompt and confirm the cancellation.

**What happens upon cancellation:**

- All enrolled participants are automatically refunded in full.
- All enrolled participants receive an in-app notification informing them of the cancellation.
- The plan is removed from public view.

> **WARNING: Cancellation is irreversible.** Once a plan is cancelled, it cannot be restored to an active state. The refund and notification process is triggered automatically and cannot be undone. Exercise this function only when necessary and after confirming with the therapist where possible.

### 5.5 Editing a Plan

Admins have the ability to edit any plan using the same editing interface available to therapists. This may be used to correct minor errors after approval, or to make adjustments in coordination with a therapist.

To edit a plan, open the plan and click the edit option. Make the required changes and save.

> **Note:** Be cautious when editing published plans. Changes to price, schedule, or location on a plan that already has enrolled participants may cause confusion. Communicate significant changes to affected participants via the messaging system (see Section 7).

---

## 6. Revenue Analytics (Revenue Tab)

The Revenue tab provides a financial overview of platform activity. This data is intended for operational monitoring and reporting purposes.

The dashboard displays the following metrics, filterable by date range:

| Metric | Description |
|---|---|
| **Total Revenue** | The total amount collected from clients during the selected period |
| **Platform Fee Income** | The platform's 15% share of all transactions |
| **Therapist Payouts** | The therapists' 85% share of all transactions |
| **Breakdown by Payment Provider** | Revenue split across Stripe, Alipay, and WeChat Pay |
| **Revenue by Type** | Breakdown between appointment revenue and plan sign-up revenue |
| **Transaction Count** | The number of individual transactions in the selected period |

**To view revenue data:**

1. Navigate to Dashboard → Revenue tab.
2. Set the desired date range using the date filter controls.
3. Review the metrics displayed on the dashboard.

> **Note:** The platform fee percentage is currently set at 15% by default. This value is configured as a server environment variable (`STRIPE_PLATFORM_FEE_PERCENT`) and cannot be changed from within the application. Any change to this percentage requires a server configuration update and restart. Contact the development team to request a change.

---

## 7. Messaging (Messages Tab)

The Messages tab allows admins to receive messages and to send communications to individual users or groups of users.

### 7.1 Viewing Received Messages

The Messages tab displays messages sent to your admin account. Review this regularly for any communications from users or other platform notifications directed to your account.

### 7.2 Sending a Broadcast Message

Admins can send messages to all users, a specific role group, or a specific individual user.

**To send a broadcast or direct message:**

1. Navigate to Dashboard → Messages tab.
2. Click "New Message" or "Broadcast".
3. Select the recipient scope from the following options:
   - **All Users** — message is sent to every registered user on the platform
   - **All Clients** — message is sent to all users with the CLIENT role
   - **All Therapists** — message is sent to all users with the THERAPIST role
   - **Specific User** — search for and select an individual user
4. Write the message body in the text field. Be clear and professional.
5. Click Send.
6. All recipients receive an in-app notification.

> **Best practice:** Use broadcast messages judiciously. Messages sent to all users will reach a large number of people. Reserve platform-wide broadcasts for important announcements such as scheduled maintenance, policy changes, or critical service updates. For targeted communications (such as notifying participants of a cancelled plan), prefer the narrower recipient scopes.

---

## 8. Platform-Wide Visibility

Admins have unrestricted visibility across the platform. This includes:

- **All therapy plans**, regardless of status — including drafts that have not yet been submitted for review
- **All appointments**, including those between individual therapists and clients
- **All form responses** submitted through the platform

This visibility is provided to enable effective administration and oversight. Access to this information should be treated with discretion in accordance with applicable privacy standards and internal data handling policies.

---

## 9. Platform Configuration Notes

The following platform settings are managed at the server level and cannot be changed from within the admin interface. Contact the development team for changes to any of these settings.

| Setting | Environment Variable | Default Value | Notes |
|---|---|---|---|
| Platform fee percentage | `STRIPE_PLATFORM_FEE_PERCENT` | 15% | Requires server restart after change |
| Admin account creation | N/A (database level) | N/A | Must be provisioned by development team |

**Refund policy:** Refund policies are set individually by each therapist. Admins cannot override a therapist's individual refund policy settings. The exception is plan cancellation (Section 5.4), which triggers automatic full refunds to all participants regardless of the therapist's refund policy.

---

## 10. Quick Reference

### Key URLs

| Page | URL |
|---|---|
| Login | `/login` |
| Admin Dashboard | `/dashboard/admin` |
| Public Therapy Plans | `/therapy-plans` |

### Plan Status Reference

| Status | Meaning |
|---|---|
| PENDING_REVIEW | Submitted by therapist, awaiting admin approval |
| PUBLISHED | Approved and publicly visible; open for sign-ups |
| SIGN_UP_CLOSED | Sign-up period has ended; plan is confirmed |
| IN_PROGRESS | Plan is currently running |
| REJECTED | Rejected by admin; therapist can edit and resubmit |
| CANCELLED | Cancelled by admin or therapist; refunds issued |

### Common Actions — At a Glance

| Task | Location | Key Consideration |
|---|---|---|
| Approve a plan | Dashboard → Plans → Open plan → Approve | Immediately makes plan public |
| Reject a plan | Dashboard → Plans → Open plan → Reject | Provide a specific, actionable rejection note |
| Cancel an active plan | Dashboard → Plans → Open plan → Cancel Plan | Irreversible; triggers automatic refunds |
| Deactivate a user | Dashboard → Users → Open user → Toggle status | Does not delete data |
| Send a broadcast | Dashboard → Messages → New Message | Select recipient scope carefully |
| View revenue | Dashboard → Revenue → Set date range | Platform fee is 15% (server-configured) |

---

*This document is intended for internal use by platform administrators only. For technical assistance or to request configuration changes, contact the development team.*
