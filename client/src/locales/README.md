# Localization Files Index

## Structure Overview

### `en.json` / `zh.json`

#### 1. **common** (Lines ~1-80)
- General UI elements (buttons, labels, status)
- Role translations
- Plan types
- Error messages

#### 2. **nav** (Lines ~81-100)
- Navigation menu items
- Header links

#### 3. **auth** (Lines ~101-200)
- Login, register, password reset
- Form labels and validation

#### 4. **home** (Lines ~201-250)
- Landing page content
- Hero section, features

#### 5. **therapists** (Lines ~251-300)
- Therapist listing page
- Search and filters

#### 6. **booking** (Lines ~301-400)
- Appointment booking flow
- Time slots, confirmation

#### 7. **profile** (Lines ~401-450)
- User profile settings
- Personal info, security

#### 8. **dashboard.therapist** (Lines ~451-650)
- **tabs**: Statistics, Therapy Plans, Products, Showcase, Calendar, Review Status, Profile Preview, Certificates
- **stats**: Revenue, visitors, plans, products, charts, filters
- **certificates**: Application and status
- **plans**: Therapy plan management
- **products**: Product management

#### 9. **dashboard.artist** (Lines ~651-750)
- Artist-specific dashboard
- Showcase, products, orders

#### 10. **dashboard.products** (Lines ~751-850)
- Product wizard (create/edit)
- Validation messages
- Step labels

#### 11. **admin** (Lines ~851-950)
- Admin dashboard
- User management
- Revenue tracking
- Plan/certificate review

#### 12. **shop** (Lines ~951-1050)
- Product catalog
- Shopping cart
- Checkout flow

#### 13. **therapyPlans** (Lines ~1051-1150)
- Plan creation wizard
- Session management
- Participant tracking

## Quick Reference

### Dashboard Statistics
- Path: `dashboard.therapist.stats.*`
- Includes: revenue, profits, visitors, paidCustomers, orders, plans, products, filters, charts

### Dashboard Tabs
- Path: `dashboard.therapist.tabs.*`
- Keys: statistics, therapyPlans, products, showcase, calendar, reviewStatus, profilePreview, certificates

### Product Management
- Path: `dashboard.products.*`
- Includes: fields, validation, steps, categories

### Admin Panel
- Path: `admin.*`
- Includes: users, appointments, revenue, plans, certificates
