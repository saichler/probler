FROM saichler/probler-builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o collector

FROM saichler/probler-security:latest AS final
RUN apk add kubectl
RUN apk add bash
COPY --from=build /home/src/github.com/saichler/build/collector /home/run/collector

ENTRYPOINT ["/home/run/collector"]