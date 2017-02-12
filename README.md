# mqtt-knx

KNX to MQTT Bridge.

##Install

    npm install

A config.yml file and groupaddresses.xml file are required. groupaddresses.xml file can be extracted by unzipping an ETS4 project file and searching for 0.xml in a folder.

##Usage

    Usage: 
    - npm start
    or
    - docker build -t fdubuisson/mqtt-knx .
    - docker run -it -v conf/:/data/conf --link mosquitto:mosquitto fdubuisson/mqtt-knx:latest
##Example

Subscribe all knx messages:

    mosquitto_sub  -h <mqtt server> -t 'knx/#' -v

Switch lamp on/off with a publish to the broker:

    mosquitto_pub -h <mqtt server> -t 'knx/<device>/<type>/<name>/set' -m 'true'
    
## TODO
- allow topic patterns to be defined in config file
- handle MQTT connection errors
- reconnect to MQTT after connection loss
