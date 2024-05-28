#!/bin/bash

# Step 1: SCP everything that isn't in .gitignore and .git to the remote server
rsync -avz --exclude-from='.gitignore' --exclude='.git' --include='.envrc.prod' ./ root@higan.fun:/root/we-hate-the-ui-backend/
(cd ../we-hate-the-ui && rsync -avz --exclude-from='.gitignore' --exclude='.git' --include='.env.prod' ./ root@higan.fun:/root/we-hate-the-ui/)

#rsync -avz --exclude-from='.gitignore' --exclude='.git' --include='.envrc.prod' ./ root@88.99.99.179:/root/we-hate-the-ui-backend/
#(cd ../we-hate-the-ui && rsync -avz --exclude-from='.gitignore' --exclude='.git' --include='.env.prod' ./ root@88.99.99.179:/root/we-hate-the-ui/)

## Step 2: SSH into the remote server, navigate to the directory, rename .envrc.prod to .envrc and run the docker commands
#ssh root@higan.fun << 'ENDSSH'
#cd /root/we-hate-the-ui/
#mv .env.prod .env
#cd /root/we-hate-the-ui-backend/
#mv .envrc.prod .env
#docker image build -t we-hate-the-ui-backend .
#docker compose up
#ENDSSH