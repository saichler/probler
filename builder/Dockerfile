FROM golang:1.24-alpine AS build
RUN apk update
RUN apk upgrade
RUN apk add net-snmp-dev
RUN apk add gcc
RUN apk add build-base
RUN apk add git
RUN apk add bash
RUN apk add --no-cache libc6-compat
RUN mkdir -p /home/src/github.com/saichler/build

COPY patch.sh /usr/lib/go/patch.sh
WORKDIR /usr/lib/go/
RUN /usr/lib/go/patch.sh
ENV GOPATH /home
ENV CGO_ENABLED 1

WORKDIR /home/src/github.com/saichler/build