FROM builder:latest AS build

# Populated automatically by buildx from --platform (blank => host default).
ARG TARGETOS=linux
ARG TARGETARCH

ENV CGO_ENABLED 1
COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
# Some layer8 modules still pin older siblings (e.g. pre-L8Register l8ql/l8utils);
# move every layer8 module to its current version so they build together.
RUN GOPROXY=direct GOPRIVATE=github.com go get $(go list -m all | awk '/^github.com\/saichler\// && $1 != "github.com/saichler/build" {print $1"@latest"}')
RUN go mod vendor

WORKDIR /
RUN /patch.sh

WORKDIR /home/src/github.com/saichler/build
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o vnet

FROM probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/vnet /home/run/vnet
RUN mkdir -p /data
RUN chmod 777 /data
ENTRYPOINT ["/home/run/vnet"]
