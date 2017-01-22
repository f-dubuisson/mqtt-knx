# mqtt-knx

KNX to MQTT Bridge.

##Install

    npm install

A config.yml file and groupaddresses.xml file are required. groupaddresses.xml file can be extracted by unzipping an ETS4 project file and searching for 0.xml in a folder.

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
