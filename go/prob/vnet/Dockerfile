FROM saichler/probler-builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o vnet

FROM saichler/probler-security:latest AS final
RUN apk add --no-cache libc6-compat
RUN mkdir -p /home/run
WORKDIR /home/run
COPY --from=build /home/src/github.com/saichler/build/vnet /home/run/vnet

ENTRYPOINT ["/home/run/vnet"]