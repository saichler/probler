FROM saichler/probler-builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o inv_box

FROM saichler/probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/inv_box /home/run/inv_box
ENTRYPOINT ["/home/run/inv_box"]