FROM saichler/probler-security:latest AS security
FROM saichler/probler-builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o parser

FROM alpine AS final
RUN apk add --no-cache libc6-compat
RUN mkdir -p /home/run
WORKDIR /home/run
COPY --from=security /home/run/security.so /home/run/security.so
COPY --from=build /home/src/github.com/saichler/build/parser /home/run/parser

ENTRYPOINT ["/home/run/parser"]