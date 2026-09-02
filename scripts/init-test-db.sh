#!/bin/sh
# Creates the database the API test suite writes to, so `pytest` works against
# the same Postgres container that serves development.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-SQL
    CREATE DATABASE ${POSTGRES_DB}_test;
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB}_test TO $POSTGRES_USER;
SQL
