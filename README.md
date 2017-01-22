# mqtt-knx

KNX to MQTT Bridge.

##Install

    npm install

    A config.yml file is required; see sample config.yml.dist.

##Usage

    Usage: ./mqtt-knx.js

##Example

Send DPT1 as true/false, DPT5 as 0..100% and DPT9 values to a mqtt broker. The topic is like 'knx/1/1/111'

    ./mqtt-knx.js

Subscribe all knx messages:

    mosquitto_sub  -h mac-server.local -t 'knx/#' -v

Switch lamp on/off with a publish to the broker:

    mosquitto_pub -h mac-server.local -t 'knx/1/1/111/set' -m 'true'
    mosquitto_pub -h mac-server.local -t 'knx/1/1/111/set' -m 'false'
