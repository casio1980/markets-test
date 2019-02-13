#!/bin/bash

# 0-30/5 17 * * 1-5 cd /var/www/markets-test/jobs && ./quote.sh
# 31-59 17 * * 1-5 cd /var/www/markets-test/jobs && ./quote.sh
# 0-29 18 * * 1-5 cd /var/www/markets-test/jobs && ./quote.sh
# 30-59/5 18 * * 1-5 cd /var/www/markets-test/jobs && ./quote.sh

node quote.js

exit 0
