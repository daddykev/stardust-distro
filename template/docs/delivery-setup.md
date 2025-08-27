# Stardust Distro Delivery Setup Guide 📡

This guide explains how to set up and manage **Delivery Targets**. This is a critical step to connect your Stardust Distro platform to the Digital Service Providers (DSPs) and aggregators who will receive your music.

---

## What is a Delivery Target?

A Delivery Target is simply a destination for your releases. It contains all the connection details and configuration requirements for a specific partner, such as Spotify, Apple Music, or a smaller aggregator.

You must configure at least one target before you can deliver any music.

---

## Adding a New Delivery Target

1.  Log in to your Stardust Distro dashboard.
2.  Navigate to **Settings** in the main menu.
3.  Select the **Delivery Targets** tab.
4.  Click the "**Add New Target**" button to open the configuration form.

The form is divided into several sections:

### 1. Basic Information

* **Target Name**: A friendly name you'll recognize (e.g., "Spotify", "Apple Music", "Test FTP Server").
* **Target Type**:
    * **DSP**: A direct-to-consumer streaming platform.
    * **Aggregator**: A third-party service that delivers to multiple DSPs on your behalf.
    * **Test**: An internal or public test server for verifying your setup.

### 2. DDEX Information

This information is crucial for DDEX-compliant messaging. Your delivery partner will provide you with these details.

* **DDEX Party Name**: The official name of the receiving party (e.g., "Apple Inc.").
* **DDEX Party ID (DPID)**: The unique identifier for the receiving party (e.g., `PADPIDA2013020802I`).

### 3. Protocol Configuration

This is the most important section. Select the delivery protocol your partner uses and fill in the required credentials. All sensitive information (passwords, API keys, etc.) is encrypted at rest in the database.

* **FTP (File Transfer Protocol)**
    * `Host`: The server address (e.g., `ftp.dsp.com`).
    * `Port`: Usually `21`.
    * `Username` & `Password`: Your login credentials.
    * `Directory`: The specific folder on the server where you should upload files (e.g., `/incoming/`).

* **SFTP (Secure File Transfer Protocol)**
    * Requires the same information as FTP, but uses a more secure connection. The port is typically `22`.

* **Amazon S3**
    * `Bucket`: The name of the S3 bucket.
    * `Region`: The AWS region of the bucket (e.g., `us-west-2`).
    * `Access Key` & `Secret Key`: Your AWS IAM credentials.
    * `Prefix`: An optional sub-folder within the bucket.

* **Azure Blob Storage**
    * `Account Name`: Your Azure Storage account name.
    * `Account Key`: Your access key for the storage account.
    * `Container Name`: The name of the container to upload to.
    * `Prefix`: An optional sub-folder within the container.

* **API (REST API)**
    * `Endpoint`: The URL to which the delivery data will be POSTed.
    * `Auth Type`: The authentication method (Bearer Token, Basic Auth, etc.).
    * `Credentials`: Your API key or token.

---

## Testing Your Connection

After filling out the protocol details, **always use the "Test Connection" button**.

This will trigger a test from the server to ensure Stardust Distro can successfully connect to the target using the credentials you provided.

* ✅ **Success**: You'll see a confirmation message. You can now save the target.
* ❌ **Failure**: The system will display an error. Double-check every field (host, username, password, directory, etc.) for typos. Also, ensure your server's firewall allows outgoing connections on the specified port.

---

## Example: Setting Up a Public Test FTP Server

Let's configure a target using a known public test server to confirm everything is working.

1.  Click "**Add New Target**".
2.  **Target Name**: `Public FTP Test`
3.  **Target Type**: `Test`
4.  **Protocol**: Select `FTP`.
5.  Fill in the credentials for `dlptest.com`:
    * **Host**: `ftp.dlptest.com`
    * **Port**: `21`
    * **Username**: `dlpuser`
    * **Password**: `rNrKYTX9g7z3RgJR`
    * **Directory**: `/` (the root directory)
6.  Click **Test Connection**. You should see a success message.
7.  Click **Save**.

You now have a working delivery target you can use to test your first delivery without sending it to a real DSP.