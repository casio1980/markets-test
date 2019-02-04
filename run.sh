#!/bin/bash

node dl.js $1 --from 2018-01-01
node makeData.js $1

exit 0
