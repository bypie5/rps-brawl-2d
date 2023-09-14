# SSL Configuration

## Manual Setup
This is a manual setup for SSL. These are the first steps to run when setting up a new server.

### Install Certbot

```bash
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install certbot
```

### Ensure Nginx is Exposing Challenge Files

Update the Nginx configuration file to expose the challenge files. The configuration can be found in
`reverseProxy/nginx.conf`.

```bash
# uncomment the following block

    # webroot challenge for certbot
    location ~ /.well-known/acme-challenge {
        allow all;
        root /var/www/certbot;
    }
```

### Obtain SSL Certificate

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d rockpaperscissorsbrawl.com -d www.rockpaperscissorsbrawl.com
```


