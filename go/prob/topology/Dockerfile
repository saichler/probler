FROM saichler/builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o topo

FROM saichler/probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/topo /home/run/topo
COPY worldcities.csv /home/run/worldcities.csv

ENTRYPOINT ["/home/run/topo"]