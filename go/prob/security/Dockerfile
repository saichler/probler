FROM saichler/probler-builder:latest AS build

RUN git clone https://github.com/saichler/shared
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
WORKDIR /home/src/github.com/saichler/build/shared/go/share/shallow_security
RUN go build -buildmode=plugin -o security.so plugin.go ShallowSecurityProvider.go
RUN mv security.so ../../../../.

FROM alpine AS final
RUN mkdir -p /home/run
WORKDIR /home/run
COPY --from=build /home/src/github.com/saichler/build/security.so /home/run/security.so