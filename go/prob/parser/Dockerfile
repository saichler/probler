FROM saichler/builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o parser

FROM saichler/probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/parser /home/run/parser
ENTRYPOINT ["/home/run/parser"]