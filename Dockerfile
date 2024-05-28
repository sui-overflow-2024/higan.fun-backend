# Base image for Node.js application
FROM node:20-bookworm-slim AS base

# Install necessary packages including Python and build tools
RUN apt-get update && apt-get install -y python3 make g++ \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Enable Corepack, which includes pnpm
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . .

# Ensure prisma files are in the correct location
COPY prisma/migrations prisma/migrations
COPY prisma/schema.prisma prisma/schema.prisma

# Build the application
RUN pnpm run build

# Download and extract prebuilt Sui binaries
FROM debian:bookworm AS sui-binary

WORKDIR /tmp

RUN apt-get update  \
    && apt-get install -y --no-install-recommends curl tar ca-certificates \
    && curl -L -o sui.tgz https://github.com/MystenLabs/sui/releases/download/testnet-v1.25.0/sui-testnet-v1.25.0-ubuntu-x86_64.tgz

RUN mkdir /tmp/sui && tar -xzf /tmp/sui.tgz -C /tmp/sui/

# Final image for the Node.js application
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y curl ca-certificates libc6
# RUN apt-get update && apt-get install -y python3 make g++ \
#    && ln -sf /usr/bin/python3 /usr/bin/python

# Enable Corepack, which includes pnpm
RUN corepack enable

WORKDIR /app

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy the dependencies from the previous build stage
COPY --from=base /app/node_modules /app/node_modules

# Copy the built application from the previous build stage
COPY --from=base /app/dist /app/dist

# Copy the prisma schema file
COPY --from=base /app/prisma/ /app/prisma/

# Copy the prebuilt Sui binaries
COPY --from=sui-binary /tmp/sui/* /usr/local/bin/
ENV PATH="/usr/local/sui/bin:${PATH}"

EXPOSE 3000
RUN npx prisma generate
RUN npx next telemetry disable
RUN apt-get update  \
    && apt-get install -y git

ENTRYPOINT ["entrypoint.sh"]

#CMD tail -f /dev/null
CMD ["node", "dist/index.js"]