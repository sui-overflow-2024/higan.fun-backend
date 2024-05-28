#!/bin/sh

docker compose down
npx prisma generate
docker image build -t we-hate-the-ui-backend .
(cd ../we-hate-the-ui && docker image build -t we-hate-the-ui .)
#docker container rm we-hate-the-ui-backend-backend-1 we-hate-the-ui-backend-frontend-1
#docker image rm we-hate-the-ui-backend we-hate-the-ui
docker compose up -d