FROM saichler/builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
COPY web /home/src/github.com/saichler/build/web
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o maint

FROM alpine AS final

RUN mkdir -p /home/run
COPY --from=build /home/src/github.com/saichler/build/maint /home/run/maint
COPY config.json /home/run/config.json
COPY web /home/run/web
#WORKDIR /home/run

ENTRYPOINT ["/home/run/maint"]