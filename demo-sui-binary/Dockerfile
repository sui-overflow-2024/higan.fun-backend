FROM ubuntu:mantic AS sui-binary

WORKDIR /tmp

RUN apt-get update && apt-get install -y --no-install-recommends curl tar ca-certificates \
    && curl -L -o sui.tgz https://github.com/MystenLabs/sui/releases/download/testnet-v1.25.0/sui-testnet-v1.25.0-ubuntu-x86_64.tgz
RUN tar -xzf sui.tgz  -C ./tmp/bin/

#RUN mv sui-testnet-v1.25.0-ubuntu-x86_64 /usr/local/sui
#    && rm -rf /var/lib/apt/lists/*

CMD tail -f /dev/null