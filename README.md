# mqtt-knx

KNX to MQTT Bridge.

##Install

    npm install

A config.yml file and groupaddresses.xml file are required. groupaddresses.xml file can be extracted by unzipping an ETS4 project file and searching for 0.xml in a folder.

##Usage

    Usage:
    - npm start
    or
    - docker run -v /home/pi/mqtt-knx:/data --link mosquitto:mosquitto -it hypriot/rpi-node /bin/bash -c "cd data && npm start"
    or
    - docker build -t fdubuisson/mqtt-knx .
    - docker run --link mosquitto:mosquitto -v conf:/conf -it fdubuisson/mqtt-knx

##Example

Send DPT1 as true/false, DPT5 as 0..100% and DPT9 values to a mqtt broker. The topic is like 'knx/1/1/111'

    ./mqtt-knx.js

Subscribe all knx messages:

    mosquitto_sub  -h mac-server.local -t 'knx/#' -v

Switch lamp on/off with a publish to the broker:

    mosquitto_pub -h mac-server.local -t 'knx/1/1/111/set' -m 'true'
    mosquitto_pub -h mac-server.local -t 'knx/1/1/111/set' -m 'false'

## TODO
- allow topic patterns to be defined in config file
