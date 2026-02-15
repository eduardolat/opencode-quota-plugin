FROM oven/bun:debian

# Config Bun
ENV PATH="~/.bun/bin:${PATH}"
RUN ln -s /usr/local/bin/bun /usr/local/bin/node

RUN \
  apt update -qq && \
  apt install -yqq git curl wget ripgrep
