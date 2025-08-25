# Stardust Distro Configuration Guide ⚙️

This guide covers how to personalize and configure your Stardust Distro instance after the initial deployment. Here, you'll manage everything from your label's branding to user access and default settings.

## Accessing Your Settings

All configuration is managed from a central location. After logging in, click on the **Settings** link in the main navigation menu on the left-hand side of the dashboard.

## 1. Tenant & Branding Settings

This section allows you to white-label the platform with your own identity.

* **Organization Name**: This is the name of your label or distribution company that will appear throughout the application.
* **Custom Branding**:
    * **Logo**: Upload your company logo. It will replace the Stardust Distro logo in the top navigation bar. We recommend using an SVG or a transparent PNG for the best results.
    * **Primary & Secondary Colors**: Choose colors that match your brand identity. These will be used for buttons, links, and other key UI elements to create a consistent look and feel.
* **Custom Domain**: For advanced users, you can configure Stardust Distro to run on your own domain (e.g., `distro.mylabel.com`). This requires additional DNS configuration with your domain provider.

## 2. Distribution Defaults

Setting defaults here will save you time when creating new releases and deliveries.

* **Default ERN Version**: Select the DDEX ERN (Electronic Release Notification) version that most of your delivery partners require. **ERN 4.3** is the recommended modern standard, but 4.2 and 3.8.2 are available for backward compatibility.
* **Default Territories**: Set the territories where you typically have distribution rights. Setting this to "**Worldwide**" is common, but you can also select specific countries or regions if needed.
* **Require DDEX Validation**: When enabled, every ERN message generated must be successfully validated against the DDEX Workbench API before it can be delivered. **It is highly recommended to keep this enabled** to prevent sending malformed data to DSPs.
* **Auto-Deliver on Release Date**: If enabled, the system will automatically create and queue a delivery for a release on its specified release date.

## 3. User Management

You can invite your team members and control their access levels.

### Inviting a New User

1.  Navigate to the **Users** tab within Settings.
2.  Click the "**Invite User**" button.
3.  Enter the user's email address and select a role for them. An invitation email will be sent with a link to sign up.

### User Roles & Permissions

Stardust Distro has three built-in user roles:

* **Viewer**: Has read-only access. Viewers can see the catalog, releases, and delivery history but cannot create, edit, or delete anything. This role is perfect for artists or team members who only need to check on status.
* **Manager**: Can manage the entire catalog and all deliveries. Managers can create, edit, and delete releases, configure delivery targets, and initiate deliveries. They cannot change tenant settings or manage users.
* **Admin**: Has full, unrestricted access to the platform. Admins can do everything a Manager can, plus they can configure tenant settings, manage branding, and invite or remove users. The first user who signs up for a new instance is automatically made an Admin.

## Next Steps

With your platform configured, the next crucial step is to set up your delivery targets.

* **[Delivery Setup Guide](./delivery-setup.md)**: Learn how to connect Stardust Distro to your DSPs and partners.