FROM alpine AS build
RUN apk update
RUN apk upgrade
RUN apk add git
RUN apk add go
RUN apk add --no-cache libc6-compat
RUN mkdir -p /home/src/github.com/saichler/build

COPY patch/plugin.go /usr/lib/go/src/runtime/plugin.go
ENV GOPATH /home
WORKDIR /home/src/github.com/saichler/build