Implement the following registration status workflow for the Election Management Platform.

## Registration Statuses

The system shall support four registration statuses:

- PENDING
- APPROVED
- REJECTED
- BLOCKED

## Email Notifications

The user should never have to repeatedly log in just to check their registration status. Whenever the registration status changes, automatically send an email to the registered email address.

### Pending

Immediately after successful registration, send:

Subject:
Registration Submitted

Body:
Your registration has been successfully submitted and is currently under review by the registration verifier. You will receive another email once your registration has been approved, rejected, or blocked.

---

### Approved

Subject:
Registration Approved

Body:
Congratulations! Your registration has been approved. You can now log in to the system and participate in the election once voting begins.

---

### Rejected

Subject:
Registration Rejected

Body:
Unfortunately, your registration has been rejected.

Reason:
<Admin Provided Rejection Reason>

If you still wish to participate, please complete the registration process again using the election registration link.

---

### Blocked

Subject:
Account Blocked

Body:
Your account has been blocked by the election administrator. You will no longer be able to log in or participate in this election. If you believe this is an error, please contact the election administrator.

---

## Login Behavior

### Pending

When a pending user attempts to log in, display:
"Your registration is still under review."

### Approved

Allow normal login.

### Rejected

Do not allow login.
Display:
"Your registration has been rejected. Please complete a new registration using the election registration link."

### Blocked

Do not allow login.
Display:
"Your account has been blocked by the election administrator."

---

## Rejected Registration Workflow

If a registration is rejected:

- The user must complete the entire registration process again.
- The user should not simply re-upload documents.
- The entire registration form, citizenship upload, wallet verification, and verification workflow must be completed again.

When a new registration is submitted:

- Delete the previously rejected registration record from the database.
- Create a completely new registration record.
- The new registration starts with status = PENDING.
- The previous rejection reason does not carry over.

The system should always maintain only the latest active registration for a rejected user.

---

## Blocked Users

Blocked users remain in the database.

Their data must NOT be deleted.

Their registration status prevents login and participation in the election until an administrator changes their status.

---

## Overall Workflow

Registration
↓
Status = PENDING
↓
Email: Registration Submitted

Verifier Reviews
↓
APPROVED
→ Email: Registration Approved
→ User can log in

OR

REJECTED
→ Email: Registration Rejected (including admin rejection reason)
→ User cannot log in
→ User must complete the full registration process again
→ Previous rejected registration is removed from the database
→ New registration starts as PENDING

OR

BLOCKED
→ Email: Account Blocked
→ User remains in the database
→ User cannot log in
→ No participation allowed until unblocked.
