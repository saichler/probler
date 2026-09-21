FROM saichler/builder:latest AS build

# Populated automatically by buildx from --platform (blank => host default).
ARG TARGETOS=linux
ARG TARGETARCH

COPY main.go /home/src/github.com/saichler/build/main.go
COPY web /home/src/github.com/saichler/build/web
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o maint

FROM alpine AS final

RUN mkdir -p /home/run
COPY --from=build /home/src/github.com/saichler/build/maint /home/run/maint
COPY config.json /home/run/config.json
COPY web /home/run/web
#WORKDIR /home/run

ENTRYPOINT ["/home/run/maint"]
