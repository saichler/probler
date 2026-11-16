FROM saichler/builder:latest AS build

# Populated automatically by buildx from --platform (blank => host default).
ARG TARGETOS=linux
ARG TARGETARCH

COPY *.go /home/src/github.com/saichler/build/
COPY help.md /home/src/github.com/saichler/build/help.md
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
# Some layer8 modules still pin older siblings (e.g. pre-L8Register l8ql/l8utils);
# move every layer8 module to its current version so they build together.
RUN GOPROXY=direct GOPRIVATE=github.com go get $(go list -m all | awk '/^github.com\/saichler\// && $1 != "github.com/saichler/build" {print $1"@latest"}')
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o agent

FROM saichler/probler-postgres:latest AS final

COPY --from=build /home/src/github.com/saichler/build/agent /home/run/agent

ENTRYPOINT ["/home/run/agent"]
