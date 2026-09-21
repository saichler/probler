FROM saichler/builder:latest AS build

# Populated automatically by buildx from --platform (blank => host default).
ARG TARGETOS=linux
ARG TARGETARCH

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o logagent

FROM saichler/probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/logagent /home/run/logagent

ENTRYPOINT ["/home/run/logagent"]
