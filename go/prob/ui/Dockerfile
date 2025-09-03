FROM saichler/probler-builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o webui

FROM saichler/probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/webui /home/run/webui
COPY ./web /home/run/web

ENTRYPOINT ["/home/run/webui"]