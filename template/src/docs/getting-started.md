# Getting Started with Stardust Distro

Welcome to Stardust Distro! This guide will walk you through setting up your own professional, open-source music distribution platform. In about 15-20 minutes, you'll go from zero to a fully deployed system.

Stardust Distro is a self-hosted platform, which means you have complete ownership and control over your data and infrastructure. Our goal is to democratize music distribution by providing a powerful, DDEX-compliant toolset for everyone.

## Prerequisites

Before you begin, make sure you have the following installed and configured:

1.  **Node.js**: We recommend version `18.x` or higher. You can download it from [nodejs.org](https://nodejs.org/).
2.  **A Google Account**: This is required to create and manage your Firebase project, which will serve as the backend for your Stardust Distro instance.
3.  **Firebase CLI**: This command-line tool allows you to deploy your project. Install it globally by running:
    ```bash
    npm install -g firebase-tools
    ```

---

## Step 1: Create Your Stardust Distro Project

We've made this part incredibly simple. Just run the following command in your terminal. Replace `my-label-distro` with the name of your project.

```bash
npx create-stardust-distro my-label-distro
```

This command will create a new folder with your chosen name, download the latest version of Stardust Distro, and install all the necessary dependencies. It's your complete, ready-to-configure platform in a box.

-----

## Step 2: Set Up Your Firebase Backend

Stardust Distro uses Google Firebase for its database, authentication, file storage, and serverless functions. This provides a scalable, secure, and cost-effective backend.

1.  **Create a Firebase Project**:

      * Go to the [Firebase Console](https://console.firebase.google.com/).
      * Click "**Create a project**" and follow the on-screen instructions. Give it a name you'll recognize (e.g., "My Label Distro Backend").

2.  **Enable Required Services**:

      * In your new project's dashboard, go to the "**Build**" section in the left-hand menu.
      * **Authentication**: Click "**Get started**". Choose "**Email/Password**" and "**Google**" as sign-in methods and enable them.
      * **Firestore Database**: Click "**Create database**". Start in **Production mode** and choose a location close to you (e.g., `us-central`).
      * **Storage**: Click "**Get started**". Follow the prompts to create a default storage bucket.
      * **Functions**: Click "**Get started**".

3.  **Upgrade to the Blaze Plan (Important\!)**:

      * Stardust Distro uses modern Cloud Functions (v2) which require the "**Blaze (Pay as you go)**" plan.
      * Click the gear icon next to "Project Overview" -\> "Usage and billing" and select the Blaze plan.
      * **Don't worry\!** The free tier is very generous. You won't pay anything unless your platform usage exceeds the free limits (hundreds of releases, thousands of deliveries per month).

4.  **Get Your Firebase Configuration**:

      * Go to **Project Overview** -\> **Project settings** (gear icon).
      * In the "General" tab, scroll down to "**Your apps**".
      * Click the web icon (`</>`) to create a new web app.
      * Give it a nickname (e.g., "Stardust Web App") and click "**Register app**".
      * Firebase will provide you with a configuration object. It will look like this:
        ```javascript
        const firebaseConfig = {
          apiKey: "AIzaSy...",
          authDomain: "my-label-distro.firebaseapp.com",
          projectId: "my-label-distro",
          storageBucket: "my-label-distro.appspot.com",
          messagingSenderId: "1234567890",
          appId: "1:1234567890:web:..."
        };
        ```
      * **Copy this entire object.** You'll need it in the next step.

-----

## Step 3: Initialize and Configure

Now, let's connect your Stardust Distro code to your new Firebase backend.

1.  Navigate into your project directory:

    ```bash
    cd my-label-distro
    ```

2.  Run the initialization command:

    ```bash
    npm run init
    ```

3.  The CLI will guide you through the setup:

      * It will ask you to **paste your Firebase configuration** object.
      * It will ask for the **Firebase Project ID** (from your config).
      * It will then configure all the necessary files automatically.

-----

## Step 4: Deploy to the Cloud

With everything configured, it's time to go live\!

1.  Log in to Firebase from your terminal:

    ```bash
    firebase login
    ```

2.  Run the deploy command:

    ```bash
    npm run deploy
    ```

This command will:

  * Build the Vue.js frontend for production.
  * Deploy the application to Firebase Hosting.
  * Deploy the security rules for Firestore and Storage.
  * Deploy the Cloud Functions that power the delivery engine.

After a few minutes, the process will complete. Your platform is now live and accessible at `https://<your-project-id>.web.app`.

-----

## Your First Hour with Stardust Distro

Congratulations on deploying your platform\! Here are the recommended next steps:

1.  **Create Your Admin Account**: Navigate to your new URL and sign up. The first user to register is automatically granted `admin` privileges.
2.  **Log In**: Sign in with your new account to access the dashboard.
3.  **Configure a Delivery Target**:
      * Go to **Settings** -\> **Delivery Targets**.
      * Click "**Add New Target**" and fill in the details for a test server or a real DSP. Use the "**Test Connection**" button to verify your credentials.
4.  **Create Your First Release**:
      * Click the "**New Release**" button and follow the step-by-step wizard to input metadata and upload your audio and artwork.
5.  **Run a Test Delivery**:
      * Go to "**New Delivery**", select your newly created release and your test target, and watch the delivery engine work in real-time.

## What's Next?

Your Stardust Distro platform is ready to go. To learn more about its advanced features, check out our other guides:

  * **[Configuration Guide](https://www.google.com/search?q=./configuration.md)**: For custom branding, domains, and advanced settings.
  * **[Catalog Migration Guide](https://www.google.com/search?q=./migration.md)**: Learn how to import your existing catalog in bulk.
  * **[Troubleshooting Guide](https://www.google.com/search?q=./troubleshooting.md)**: Find solutions to common issues.

## Getting Help

If you get stuck, the Stardust Distro community is here to help.

  * **GitHub Discussions**: [link-to-your-discussions-page]
  * **Discord Server**: [link-to-your-discord-server]

Happy distributing\!