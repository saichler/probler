FROM builder:latest AS build

# Populated automatically by buildx from --platform (blank => host default).
ARG TARGETOS=linux
ARG TARGETARCH

COPY main.go /home/src/github.com/saichler/build/main.go
COPY summary.go /home/src/github.com/saichler/build/summary.go
RUN go mod init
#RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN GOPROXY=https://proxy.golang.org,direct GOPRIVATE=github.com go mod tidy
# Some layer8 modules still pin older siblings (e.g. pre-L8Register l8ql/l8utils);
# move every layer8 module to its current version so they build together.
RUN GOPROXY=direct GOPRIVATE=github.com go get $(go list -m all | awk '/^github.com\/saichler\// && $1 != "github.com/saichler/build" {print $1"@latest"}')
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o collector

FROM probler-security:latest AS final
RUN apk add kubectl
RUN apk add bash
RUN apk add net-snmp-tools
RUN apk add net-snmp-dev

COPY --from=build /home/src/github.com/saichler/build/collector /home/run/collector

ENTRYPOINT ["/home/run/collector"]
