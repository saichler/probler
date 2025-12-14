FROM saichler/builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o orm

FROM saichler/probler-postgres:latest AS final

COPY --from=build /home/src/github.com/saichler/build/orm /home/run/orm

ENTRYPOINT ["/home/run/orm"]