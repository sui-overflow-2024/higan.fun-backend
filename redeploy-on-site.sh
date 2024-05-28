#!/bin/sh

docker container rm we-hate-the-ui-backend-backend-1 we-hate-the-ui-backend-frontend-1
docker image rm we-hate-the-ui-backend we-hate-the-ui
docker compose up -d