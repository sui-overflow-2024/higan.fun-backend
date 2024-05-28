#!/bin/bash

# Build the backend image in the current directory
docker image build -t we-hate-the-ui-backend .

# Change to the we-hate-the-ui directory in a subshell and build the second image
(
  cd ../we-hate-the-ui || exit
  docker image build -t we-hate-the-ui .
)