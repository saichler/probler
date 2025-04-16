su postgres -c "pg_ctl start -D /var/lib/postgresql/data"
su postgres -c "./user.sh"
./orm