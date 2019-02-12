#!/bin/bash

# Crontab this script like this:
#
# * 16-17 * * 1-5 cd /var/www/markets-test/jobs && ./quote.sh

node quote.js

exit 0
