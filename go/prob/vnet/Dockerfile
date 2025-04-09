FROM alpine AS build
RUN apk update
RUN apk upgrade
RUN apk add git
RUN apk add go
RUN apk add --no-cache libc6-compat
RUN mkdir -p /home/src/github.com/saichler/build
COPY main.go /home/src/github.com/saichler/build/main.go
ENV GOPATH /home
WORKDIR /home/src/github.com/saichler/build
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build

RUN mkdir -p /home/run
COPY vnet /home/run/vnet
ENTRYPOINT ["/home/run/vnet"]