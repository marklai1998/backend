#!/bin/sh

ServerName="mfp-backend"	#Name

case "$1" in

start)
	screen -S $ServerName ./start.sh noscreen
	;;
noscreen)
	echo "[Web] ${ServerName} is starting..."
	echo "[Web] Pulling source..."
    git pull
    echo "[Web] Source updated"
    echo "[Web] Starting server..."
    npm run start
	;;
stop)
	echo "[Web] ${ServerName} is stopping..."
	screen -S $ServerName -X quit
	echo "[Web] ${ServerName} is offline."
	;;
esac
exit 0
