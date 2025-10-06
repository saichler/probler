FROM saichler/builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o website

FROM saichler/no-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/website /home/run/website
COPY ./web /home/run/web

ENTRYPOINT ["/home/run/website"]