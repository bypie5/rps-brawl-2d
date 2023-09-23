# Deployment

## Requirements
- Docker

## Configuration
Ensure that the following environment variables are set:

```bash
DB_USER="root"
DB_PASSWORD=<your_password>
EXPRESS_SESSION_SECRET=<your_secret>
JWT_SIGNING_SECRET=<your_secret>
DB_HOST="localhost"

# for docker-compose env
MYSQL_ROOT_PASSWORD=<your_password>
MYSQL_DATABASE="dev"
MYSQL_USER=<your_user>
MYSQL_PASSWORD=<your_password>
```
You can set these environment variables in a `.env` file in the root directory of this project.

## Build
```bash
sudo docker compose build
```

## Run

To run the server and required services, run:
```bash
sudo docker compose up -d
```