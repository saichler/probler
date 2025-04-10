FROM saichler/probler-security:latest AS security

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
COPY ./patch/plugin.go /usr/lib/go/src/runtime/plugin.go
RUN go build -o vnic

FROM alpine AS final
RUN apk add --no-cache libc6-compat
RUN mkdir -p /home/run
WORKDIR /home/run
COPY --from=security /home/run/security.so /home/run/security.so
COPY --from=build /home/src/github.com/saichler/build/vnic /home/run/vnic

ENTRYPOINT ["/home/run/vnic"]