FROM saichler/probler-builder:latest AS build

COPY main.go /home/src/github.com/saichler/build/main.go
RUN go mod init
RUN GOPROXY=direct GOPRIVATE=github.com go mod tidy
RUN go build -o orm

FROM saichler/probler-security:latest AS final

RUN apk add postgresql
RUN mkdir /run/postgresql
RUN chown -R postgres:postgres /run/postgresql/

USER postgres
RUN mkdir /var/lib/postgresql/data
RUN chmod 0700 /var/lib/postgresql/data
RUN initdb -D /var/lib/postgresql/data

#RUN apk add --no-cache libc6-compat
USER root
COPY --from=build /home/src/github.com/saichler/build/orm /home/run/orm
COPY user.sql /home/run/user.sql
COPY user.sh /home/run/user.sh
COPY run.sh /home/run/run.sh

ENTRYPOINT ["/bin/sh","/home/run/run.sh"]
#ENTRYPOINT ["/bin/sh"]