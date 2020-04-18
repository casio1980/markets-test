#!/bin/bash
until yarn robot; do
echo "Respawning..."
sleep 1
done