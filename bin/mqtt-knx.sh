#! /bin/bash

# This runs as the user called pi - please change as you require
USER=pi

LOG=/var/log/qm4/mqtt-knx.log

case "$1" in

start)
    if pgrep -f ".*mqtt-knx.js" > /dev/null
    then
        echo "mqtt-knx already running."
    else
        echo "Starting mqtt-knx"
        touch $LOG
        chown $USER:$USER $LOG
        echo "" >> $LOG
        echo "mqtt-knx service start: "$(date) >> $LOG
        su -l $USER -c "~/mqtt-knx/mqtt-knx.js >> $LOG &"
        echo "Logging to "$LOG
    fi
;;

stop)
    if pgrep -f ".*mqtt-knx.js" > /dev/null
    then
        echo "Stopping mqtt-knx..."
        pkill -SIGINT -f ".*mqtt-knx.js"
        sleep 2
        echo "" >> $LOG
        echo "mqtt-knx service stop: "$(date) >> $LOG
    else
        echo "mqtt-knx is not running."
    fi
;;

restart)
        echo "Restarting mqtt-knx..."
        $0 stop
        sleep 2
        $0 start
        echo "Restarted."
;;
*)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
esac
