# SSL Production Configuration Instructions

Follow these instructions to provision and configure Let's Encrypt TLS certificates using **Certbot** on your production host (Ubuntu/Debian) running Nginx.

---

## Prerequisite Configurations

1. **DNS Setup**: Ensure your domain name (e.g., `photography.yourstudio.com`) points to the public IP address of your production server via an `A` record.
2. **Ports Open**: Verify that your firewall is configured to allow ports `80` (HTTP) and `443` (HTTPS):
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```

---

## Step 1: Install Certbot & Nginx Plugin

Run the following command on your hosting container or VM to install the snapd package manager and Certbot:

```bash
# Update local packages list
sudo apt update

# Install snap daemon
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core

# Install Certbot via Snap
sudo snap install --classic certbot

# Link Certbot binary to execution path
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

---

## Step 2: Request the SSL Certificate

Run Certbot to automatically fetch the certificate and verify ownership using the Nginx plugin:

```bash
sudo certbot --nginx -d photography.yourstudio.com
```

### Prompt Selections:
* **Email Address**: Input your admin email (e.g., `admin@yourstudio.com`) for critical expiration notices.
* **Terms of Service**: Accept the Let's Encrypt terms.
* **Redirects**: Select **2** (Redirect) to automatically rewrite all HTTP requests to secure HTTPS. This matches the redirect rules inside our `nginx.conf`.

---

## Step 3: Secure Diffie-Hellman Parameters (Highly Recommended)

To achieve an **A+** security rating on SSL Labs, generate a strong, custom Diffie-Hellman cryptographic group:

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 4096
```

Then, add the following directive in your Nginx configuration inside the `server` block:
```nginx
ssl_dhparam /etc/nginx/ssl/dhparam.pem;
```

---

## Step 4: Verify Automated SSL Certificate Renewal

Let's Encrypt certificates are valid for 90 days. Certbot installs a systemd timer that automatically checks for expiration and renews twice daily.

To test that renewal works correctly, execute a dry run:

```bash
sudo certbot renew --dry-run
```

If the dry run succeeds, your portal's SSL certificate is fully managed, automated, and secure!
