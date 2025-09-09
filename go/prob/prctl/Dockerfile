FROM saichler/probler-builder:latest AS build

ENV CGO_ENABLED 1
COPY prctl.go /home/src/github.com/saichler/build/prctl.go
COPY commands /home/src/github.com/saichler/build/commands
COPY creates /home/src/github.com/saichler/build/creates

RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o prctl

FROM saichler/probler-security:latest AS final
COPY --from=build /home/src/github.com/saichler/build/prctl /home/run/prctl
COPY lab.conf /home/run/lab.conf
COPY add-devices /home/run/add-devices
#ENTRYPOINT ["/home/run/vnet"]