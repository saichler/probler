FROM builder:latest AS build

# Populated automatically by buildx from --platform (blank => host default).
ARG TARGETOS=linux
ARG TARGETARCH

COPY main.go /home/src/github.com/saichler/build/main.go
COPY help.md /home/src/github.com/saichler/build/help.md
COPY llm-ca.crt /home/src/github.com/saichler/build/llm-ca.crt
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
# Some layer8 modules still pin older siblings; move every layer8 module to its
# current version so they build together.
RUN GOPROXY=direct GOPRIVATE=github.com go get $(go list -m all | awk '/^github.com\/saichler\// && $1 != "github.com/saichler/build" {print $1"@latest"}')
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o chatagent

FROM probler-security:latest AS final

COPY --from=build /home/src/github.com/saichler/build/chatagent /home/run/chatagent

ENTRYPOINT ["/home/run/chatagent"]
